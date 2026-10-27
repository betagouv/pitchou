import { validateSample } from "./validation.mjs";
import { writeRecord } from "./writer.mjs";
import { writePhase } from "./phase.mjs";
export async function importSamples(client, samples, reviewerEmail) {
  const keys = new Set();
  for (const sample of samples) {
    validateSample(sample);
    if (keys.has(sample.identity.key)) throw new Error("Repeated dossier identity");
    keys.add(sample.identity.key);
  }
  const { reviewer, groups } = await getReviewer(client, reviewerEmail);
  const report = [];
  for (const sample of samples) {
    const key = sample.identity.key,
      fields = sample.proposal.dossier;
    const owned = (
      await client.query(
        "SELECT target_id FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$1",
        [key],
      )
    ).rows[0];
    const matches = fields.onagre_demande_identifier
      ? (
          await client.query("SELECT id FROM dossier WHERE onagre_demande_identifier=$1", [
            fields.onagre_demande_identifier,
          ])
        ).rows
      : [];
    if (matches.some((row) => String(row.id) !== owned?.target_id))
      throw new Error(`Existing unowned dossier for ${key}; automatic adoption is disabled.`);
    const dossier = await writeRecord(client, key, key, "dossier", fields, {});
    const outcomes = [dossier],
      targets = new Map([[key, dossier.targetId]]);
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
    // Local review routing only. Never inferred as a production service correspondence.
    await client.query(
      "INSERT INTO edge_groupe_instructeurs__dossier (dossier,groupe_instructeurs) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [dossier.targetId, groups[0].id],
    );
    await client.query(
      "INSERT INTO edge_personne_follows_dossier (dossier,personne) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [dossier.targetId, reviewer.id],
    );
    const stale = (
      await client.query(
        "SELECT source_key FROM onagre_local_import.identity WHERE dossier_key=$1",
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

async function getReviewer(client, reviewerEmail) {
  const reviewer = (
    await client.query(
      "SELECT id FROM auth_user WHERE email=$1 AND active AND pitchou_can_instruct(id)",
      [reviewerEmail],
    )
  ).rows[0];
  if (!reviewer) throw new Error("Reviewer must be an existing active local instructeur");
  const groups = (
    await client.query(
      "SELECT g.id FROM user_groupe m JOIN groupe_instructeurs g ON g.id=m.groupe_instructeurs WHERE m.user_id=$1 AND g.active ORDER BY g.id",
      [reviewer.id],
    )
  ).rows;
  if (groups.length === 0) throw new Error("Reviewer has no active local group");
  return { reviewer, groups };
}
