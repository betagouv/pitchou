import { reconciliationHash, reconciliationEvidence } from "./linked.mjs";
import { validateProjects } from "./projects.mjs";
import { getReviewer } from "./routing.mjs";
import { lockDossierAccess } from "../../../libs/server/src/dossierRouting.ts";
import { dossiersAccessibleToUser } from "../../../libs/server/src/database/dossier/access.ts";
import { reviewedFileMetadata } from "./link-existing/files.mjs";

/** A negative review is restricted to one exact pair and expires when either side changes. */
export async function recordExcludedCandidates(client, entries, reviewerEmail) {
  for (const entry of entries) validateProjects([entry.project]);
  await lockDossierAccess(client.trx);
  await client.query(
    "LOCK TABLE dossier, decision_administrative, avis_expert, commentaire IN SHARE MODE",
  );
  const reviewer = await getReviewer(client, reviewerEmail);
  const access = await dossiersAccessibleToUser(
    entries.map((e) => e.decision.dossierId),
    reviewer.id,
    client.trx,
  );
  const checked = [],
    keys = new Set();
  for (const { project, decision } of entries) {
    const key = `${project.identity.key}/${decision.dossierId}`;
    if (keys.has(key)) throw new Error("Duplicate excluded pair");
    keys.add(key);
    if (
      decision.action !== "exclude_candidate" ||
      decision.projectHash !== reconciliationHash(project) ||
      typeof decision.reason !== "string" ||
      decision.reason.trim().length < 80 ||
      !decision.targetEvidenceHash ||
      access.get(decision.dossierId) !== "complet"
    )
      throw new Error(
        "An explicit negative review, exact hashes and full target access are required",
      );
    const target = (
      await client.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [
        decision.dossierId,
      ])
    ).rows[0]?.row;
    if (
      !target ||
      reconciliationHash(target) !== decision.targetHash ||
      reconciliationHash(await reconciliationEvidence(client, decision.dossierId)) !==
        decision.targetEvidenceHash
    )
      throw new Error("Excluded target or evidence changed since review");
    await assertExcludedFiles(client, target, decision);
    const linked = await client.query(
      "SELECT 1 FROM onagre_local_import.reconciled_demande WHERE project_key=$1 AND dossier_id=$2",
      [project.identity.key, decision.dossierId],
    );
    if (linked.rows.length > 0) throw new Error("A linked pair cannot be excluded");
    const previous = (
      await client.query(
        "SELECT decision FROM onagre_local_import.excluded_candidate WHERE project_key=$1 AND dossier_id=$2",
        [project.identity.key, decision.dossierId],
      )
    ).rows[0];
    if (previous && reconciliationHash(previous.decision) !== reconciliationHash(decision))
      throw new Error("An existing negative review cannot be replaced implicitly");
    checked.push({ project, decision, unchanged: !!previous });
  }
  await writeExclusions(client, checked, reviewer.id);
  return checked.map(({ project, decision, unchanged }) => ({
    projectId: project.identity.sourceId,
    dossierId: decision.dossierId,
    status: unchanged ? "unchanged" : "excluded",
  }));
}

async function writeExclusions(client, checked, reviewerId) {
  for (const { project, decision, unchanged } of checked) {
    if (unchanged) continue;
    await client.query(
      `INSERT INTO onagre_local_import.excluded_candidate
      (project_key,dossier_id,source_hash,target_hash,evidence_hash,decision,reviewed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        project.identity.key,
        decision.dossierId,
        decision.projectHash,
        decision.targetHash,
        decision.targetEvidenceHash,
        decision,
        reviewerId,
      ],
    );
  }
}

export async function readExcludedCandidates(client, project) {
  const exists = (
    await client.query(
      "SELECT to_regclass('onagre_local_import.excluded_candidate') IS NOT NULL AS present",
    )
  ).rows[0].present;
  if (!exists) return new Set();
  // Stabilize the evidence while validating the negative decision and importing.
  await client.query(
    "LOCK TABLE dossier, decision_administrative, avis_expert, commentaire IN SHARE MODE",
  );
  const rows = (
    await client.query(
      `SELECT r.*,to_jsonb(d) AS current
    FROM onagre_local_import.excluded_candidate r LEFT JOIN dossier d ON d.id=r.dossier_id
    WHERE r.project_key=$1`,
      [project.identity.key],
    )
  ).rows;
  for (const row of rows) {
    if (
      row.source_hash !== reconciliationHash(project) ||
      !row.current ||
      row.target_hash !== reconciliationHash(row.current) ||
      row.evidence_hash !== reconciliationHash(await reconciliationEvidence(client, row.dossier_id))
    )
      throw new Error(
        `Negative reconciliation review is stale: ${project.identity.key}/${row.dossier_id}`,
      );
    await assertExcludedFiles(client, row.current, row.decision);
  }
  return new Set(rows.map((r) => r.dossier_id));
}

async function assertExcludedFiles(client, target, decision) {
  if (!decision.targetFilesHash) return;
  const evidence = await reconciliationEvidence(client, target.id);
  if (
    reconciliationHash(await reviewedFileMetadata(client, target, evidence)) !==
    decision.targetFilesHash
  )
    throw new Error("Excluded target file metadata changed since review");
}
