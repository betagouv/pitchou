import { onagreReferences } from "../../../../libs/server/src/onagre/reconciliation.ts";
import { validateProjects } from "../projects.mjs";
import { reconciliationHash, reconciliationEvidence } from "../linked.mjs";
import { reconciliationSource, reconcileProjects } from "../reconciliation.mjs";
import { assertReviewedScope } from "./scope.mjs";
import { reviewedFileMetadata } from "./files.mjs";
import { assertSharedTargets } from "./shared.mjs";

export function reviewedGroups(entries) {
  const mainIds = new Set(entries.map((e) => e.decision.dossierId));
  if (entries.some((e) => e.decision.relatedExisting?.some((r) => mainIds.has(r.dossierId))))
    throw new Error("A DN record cannot be both a main and a secondary target in one plan");
  const groups = new Map(),
    keys = new Set();
  for (const { project, decision } of entries) {
    if (keys.has(decision.demandeKey))
      throw new Error("A demande cannot have two reviewed targets");
    keys.add(decision.demandeKey);
    const hash = reconciliationHash(project);
    if (
      decision.action !== "link_existing_demande" ||
      decision.projectHash !== hash ||
      typeof decision.reason !== "string" ||
      decision.reason.trim().length < 40
    )
      throw new Error("A reviewed decision with an exact source hash and reason is required");
    const demande = project.demandes.find((d) => d.identity.key === decision.demandeKey);
    if (!demande) throw new Error("Decision does not identify a prepared demande");
    const key = project.identity.key;
    if (!groups.has(key)) groups.set(key, { project, hash, entries: [] });
    const group = groups.get(key);
    if (group.hash !== hash) throw new Error("Conflicting snapshots for the same source project");
    group.entries.push({ demande, decision });
  }
  assertSharedTargets([...groups.values()]);
  validateProjects([...groups.values()].map((g) => g.project));
  return [...groups.values()];
}

export function assertReviewedCandidates(group, targets) {
  const candidates = reconcileProjects([reconciliationSource(group.project)], targets)[0]
    .candidates;
  if (
    candidates.length !== new Set(group.entries.map((e) => e.decision.dossierId)).size ||
    candidates.some((candidate) => {
      const entries = group.entries.filter((e) => e.decision.dossierId === candidate.dossierId);
      if (entries.length === 1 && entries[0].decision.matchProfile)
        return candidate.demandeIds.length > 0;
      return (
        entries.length === 0 ||
        candidate.demandeIds.length !== entries.length ||
        entries.some((e) => !candidate.demandeIds.includes(e.demande.identity.sourceId))
      );
    })
  )
    throw new Error(`Other candidates require review: ${group.project.identity.key}`);
}

export async function reviewedTarget(client, project, demande, decision) {
  const current = (
    await client.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1 FOR UPDATE", [
      decision.dossierId,
    ])
  ).rows[0]?.row;
  if (!current || reconciliationHash(current) !== decision.targetHash)
    throw new Error(`Target changed since review: ${decision.dossierId}`);
  const evidence = decision.targetEvidenceHash
    ? await reconciliationEvidence(client, decision.dossierId)
    : null;
  if (decision.targetEvidenceHash && decision.targetEvidenceHash !== reconciliationHash(evidence))
    throw new Error(`Target evidence changed since review: ${decision.dossierId}`);
  if (
    decision.targetFilesHash &&
    (!decision.targetEvidenceHash ||
      decision.targetFilesHash !==
        reconciliationHash(await reviewedFileMetadata(client, current, evidence)))
  )
    throw new Error(`Target file metadata changed since review: ${decision.dossierId}`);
  if (current.source !== "demarche_numerique")
    throw new Error("This linking profile only supports existing DN records");
  const code = demande.proposal.dossier.onagre_demande_identifier?.trim().toLowerCase();
  if (decision.matchProfile) assertReviewedScope(project, demande, current, evidence, decision);
  else if (!code || !onagreReferences(current.onagre_demande_identifier).has(code))
    throw new Error(
      "A complete demande reference is required; names and project codes alone cannot link records",
    );
  if (
    (await client.query("SELECT 1 FROM dossier_demande WHERE dossier=$1", [decision.dossierId]))
      .rows.length > 0
  )
    throw new Error(
      "Preserve the existing project grouping; explicit grouping reconciliation required",
    );
  if (
    (
      await client.query(
        "SELECT 1 FROM onagre_local_import.identity WHERE table_name='dossier' AND target_id=$1",
        [String(decision.dossierId)],
      )
    ).rows.length > 0
  )
    throw new Error("The target is already managed by the importer");
  return current;
}
