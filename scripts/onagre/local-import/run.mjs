import { validateSample } from "./validation.mjs";
import { writeRecord } from "./writer.mjs";
import { writeActors } from "./actors.mjs";
import { writePhase } from "./phase.mjs";
import { prepareSpeciesFile, writeSpecies } from "./species.mjs";
import { validateProjects } from "./projects.mjs";
import { writeProject, writeMembership } from "./grouping.mjs";
import { getReviewer, grantLocalReview, finalizeRouting } from "./routing.mjs";
import { lockDossierAccess } from "../../../libs/server/src/dossierRouting.ts";
import { assertNoUnreviewedDuplicates } from "./reconciliation.mjs";
import { readReconciledLinks } from "./linked.mjs";

export async function importSamples(client, projects, reviewerEmail, options = {}) {
  validateProjects(projects);
  await lockDossierAccess(client.trx);
  const excludedCandidates = await assertNoUnreviewedDuplicates(client, projects);
  const reviewer = await getReviewer(client, reviewerEmail);
  const report = [];
  for (const project of projects) {
    const links = await readReconciledLinks(client, project);
    if (links.length > 0) {
      // A reviewed link does not transfer ownership of a DN record to this importer.
      for (const demande of project.demandes) {
        const link = links.find((row) => row.source_key === demande.identity.key);
        if (!link) throw new Error(`Missing reviewed demande link: ${demande.identity.key}`);
        report.push({
          sourceKey: demande.identity.key,
          dossierId: link.dossier_id,
          projectId: link.project_id,
          projectKey: project.identity.key,
          reconciliation: "linked_existing",
          outcomes: [],
          retainedRemovedRecords: [],
          issues: demande.issues,
        });
      }
      continue;
    }
    const group = await writeProject(client, project);
    const demandes = await importDemandes(
      client,
      project.demandes,
      reviewer,
      options,
      project.proposal.name,
      excludedCandidates.get(project.identity.sourceId),
    );
    for (let index = 0; index < demandes.length; index++) {
      const demande = demandes[index];
      const member = await writeMembership(
        client,
        project.demandes[index],
        demande.dossierId,
        group.targetId,
      );
      demande.outcomes.push(member);
      demande.retainedRemovedRecords = demande.retainedRemovedRecords.filter(
        (key) => key !== member.sourceKey,
      );
      demande.projectId = group.targetId;
      demande.projectKey = project.identity.key;
      demande.projectOutcome = group;
      report.push(demande);
    }
  }
  await finalizeRouting(
    client,
    report
      .filter((item) => item.reconciliation !== "linked_existing")
      .map((item) => item.dossierId),
    reviewer,
  );
  return report;
}

async function importDemandes(client, samples, reviewer, options, projectName, excluded) {
  const keys = new Set();
  for (const sample of samples) {
    validateSample(sample);
    if (keys.has(sample.identity.key)) throw new Error("Repeated dossier identity");
    keys.add(sample.identity.key);
  }
  const report = [];
  for (const sample of samples) {
    const key = sample.identity.key;
    const fields = await prepareDossier(client, sample, projectName, excluded);
    const speciesFile = await prepareSpeciesFile(client, sample);
    if (speciesFile) fields.especes_impactees = speciesFile.result.targetId;
    const dossier = await writeRecord(client, key, key, "dossier", fields, {});
    const outcomes = [dossier],
      targets = new Map([[key, dossier.targetId]]);
    for (const result of await writeActors(client, sample, Number(dossier.targetId))) {
      outcomes.push(result);
      targets.set(result.sourceKey, result.targetId);
    }
    if (speciesFile) {
      const speciesResults = await writeSpecies(
        client,
        sample,
        Number(dossier.targetId),
        speciesFile.result.targetId,
      );
      for (const result of [speciesFile.result, ...speciesResults]) {
        outcomes.push(result);
        targets.set(result.sourceKey, result.targetId);
      }
      options.files?.push(speciesFile);
    }
    for (const record of sample.proposal.records ?? []) {
      const parent =
        record.table === "prescription"
          ? { decision_administrative: targets.get(record.parentSourceKey) }
          : { dossier: Number(dossier.targetId) };
      const result =
        record.table === "evenement_phase_dossier"
          ? await writePhase(client, key, record, dossier.targetId)
          : await writeRecord(client, key, record.sourceKey, record.table, record.values, parent);
      targets.set(record.sourceKey, result.targetId);
      outcomes.push(result);
    }
    await grantLocalReview(client, key, Number(dossier.targetId), reviewer.id);
    const stale = (
      await client.query(
        "SELECT source_key FROM onagre_local_import.identity WHERE dossier_key=$1 AND table_name NOT IN ('dossier_user_access','dossier_demande')",
        [key],
      )
    ).rows
      .filter((row) => !targets.has(row.source_key))
      .map((row) => row.source_key);
    report.push({
      sourceKey: key,
      dossierId: Number(dossier.targetId),
      outcomes,
      retainedRemovedRecords: stale,
      issues: sample.issues,
    });
  }
  return report;
}

async function prepareDossier(client, sample, projectName, excluded) {
  const key = sample.identity.key,
    fields = { ...sample.proposal.dossier, name: projectName };
  if (fields.main_activite != null) {
    const activities = (
      await client.query(
        `SELECT DISTINCT a.code, a.label FROM activite a
           JOIN activite_label canonical ON canonical.label=a.label
             AND canonical.activite_code=a.code AND NOT canonical.needs_review
           LEFT JOIN activite_label alias ON alias.activite_code=a.code AND NOT alias.needs_review
           WHERE a.code=$1 OR a.label=$1 OR alias.label=$1`,
        [fields.main_activite],
      )
    ).rows;
    if (activities.length !== 1)
      throw new Error(`Activity must resolve to one existing reviewed Pitchou activity: ${key}`);
    // Dossiers store labels; the referentiel resolves them back to activity codes.
    fields.main_activite = activities[0].label;
  }
  const owned = (
    await client.query(
      "SELECT target_id, last_fields FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$1",
      [key],
    )
  ).rows[0];
  const matches = fields.onagre_demande_identifier
    ? (
        await client.query(
          `SELECT d.id, EXISTS (
          SELECT 1 FROM onagre_local_import.identity i
          WHERE i.table_name='dossier' AND i.target_id=d.id::text
            AND i.source_key=i.dossier_key AND i.dossier_key LIKE 'onagre-national:demandes:%'
        ) AS imported_onagre FROM dossier d WHERE d.onagre_demande_identifier=$1`,
          [fields.onagre_demande_identifier],
        )
      ).rows
    : [];
  // Source IDs identify demandes; Onagre display codes are not unique in the dump.
  // Only exact, hash-checked negative reviews from the locked preflight can bypass a code clash.
  if (
    matches.some(
      (row) => String(row.id) !== owned?.target_id && !row.imported_onagre && !excluded.has(row.id),
    )
  )
    throw new Error(`Existing unowned dossier for ${key}; automatic adoption is disabled.`);
  if (sample.proposal.speciesImpacts !== undefined && owned) {
    const current = (
      await client.query("SELECT especes_impactees FROM dossier WHERE id=$1 FOR UPDATE", [
        owned.target_id,
      ])
    ).rows[0];
    if ((current?.especes_impactees ?? null) !== (owned.last_fields.especes_impactees ?? null))
      throw new Error("Species attachment was edited locally; reconcile before importing");
    if (sample.proposal.speciesImpacts.length === 0 && current?.especes_impactees)
      throw new Error("Species impact removal requires explicit reconciliation");
  }
  return fields;
}
