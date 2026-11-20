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
import { prepareReviewedLocation } from "./locations.mjs";
import { writeConsultations } from "./consultations.mjs";
import { writeAttachments } from "./attachments.mjs";
import { enrichLinkedDemande } from "./enrich.mjs";

export async function importSamples(client, projects, reviewerEmail, options = {}) {
  validateProjects(projects);
  await lockDossierAccess(client.trx);
  const { excluded, blockedSiblings } = await assertNoUnreviewedDuplicates(client, projects);
  const reviewer = await getReviewer(client, reviewerEmail);
  const report = [];
  for (const project of projects) {
    const links = await readReconciledLinks(client, project);
    const byDemande = new Map(links.map((link) => [link.source_key, link]));
    const unlinked = project.demandes.filter((demande) => !byDemande.has(demande.identity.key));
    if (links.length > 0) {
      report.push(...(await enrichLinkedDemandes(client, project, byDemande, options)));
      if (unlinked.length === 0) continue;
      if (blockedSiblings.has(project.identity.sourceId)) {
        for (const demande of unlinked)
          report.push({
            sourceKey: demande.identity.key,
            projectKey: project.identity.key,
            projectId: links[0].project_id,
            reconciliation: "scope_review_required",
            outcomes: [],
            retainedRemovedRecords: [],
            issues: demande.issues,
          });
        continue;
      }
    }
    const samples = unlinked.map(prepareReviewedLocation);
    const group =
      links.length > 0 ? { targetId: links[0].project_id } : await writeProject(client, project);
    const demandes = await importDemandes(
      client,
      samples,
      reviewer,
      options,
      project.proposal.name,
      excluded.get(project.identity.sourceId),
    );
    for (let index = 0; index < demandes.length; index++) {
      const demande = demandes[index];
      const member = await writeMembership(
        client,
        samples[index],
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
      .filter((item) => item.dossierId && item.reconciliation !== "linked_existing")
      .map((item) => item.dossierId),
    reviewer,
  );
  return report;
}

async function enrichLinkedDemandes(client, project, links, options) {
  const report = [];
  for (const demande of project.demandes) {
    const link = links.get(demande.identity.key);
    if (!link) continue;
    const enrichment = await enrichLinkedDemande(client, demande, link.dossier_id, options);
    report.push({
      sourceKey: demande.identity.key,
      dossierId: link.dossier_id,
      projectId: link.project_id,
      projectKey: project.identity.key,
      reconciliation: "linked_existing",
      outcomes: enrichment.outcomes,
      enrichment,
      retainedRemovedRecords: [],
      issues: demande.issues,
    });
  }
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
    outcomes.push(...(await writeRelatedRecords(client, sample, dossier.targetId, targets)));
    const attachments = await writeAttachments(client, sample, Number(dossier.targetId), options);
    for (const result of attachments.outcomes) {
      targets.set(result.sourceKey, result.targetId);
      outcomes.push(result);
    }
    for (const sourceId of attachments.ids.keys())
      targets.set(`onagre-national:piecesjointes:${sourceId}:attachment`, true);
    await writeConsultations(client, sample, Number(dossier.targetId), targets, attachments.ids);
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
      ...(attachments.unavailable.length > 0 || attachments.conflicts.length > 0
        ? {
            enrichment: {
              unavailableAttachments: attachments.unavailable,
              conflicts: attachments.conflicts,
            },
          }
        : {}),
      retainedRemovedRecords: stale,
      issues: sample.issues,
      ...(sample.locationCorrection ? { locationCorrection: sample.locationCorrection } : {}),
    });
  }
  return report;
}

async function writeRelatedRecords(client, sample, dossierId, targets) {
  const outcomes = [];
  for (const record of sample.proposal.records ?? []) {
    const parent =
      record.table === "prescription"
        ? { decision_administrative: targets.get(record.parentSourceKey) }
        : { dossier: Number(dossierId) };
    const key = sample.identity.key;
    const result =
      record.table === "evenement_phase_dossier"
        ? await writePhase(client, key, record, dossierId)
        : await writeRecord(client, key, record.sourceKey, record.table, record.values, parent);
    targets.set(record.sourceKey, result.targetId);
    outcomes.push(result);
  }
  return outcomes;
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
