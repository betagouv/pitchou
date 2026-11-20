import { writeRecord } from "./writer.mjs";
import { writeAttachments } from "./attachments.mjs";
import { writeConsultations } from "./consultations.mjs";

export async function enrichLinkedDemande(client, sample, dossierId, options) {
  const expertIds = new Map();
  const outcomes = [];
  const conflicts = [];
  const opinions = await client.trx("avis_expert").where("dossier", dossierId).forUpdate();
  for (const record of sample.proposal.records ?? []) {
    if (record.table !== "avis_expert") continue;
    const { expert, avis, avis_date } = record.values;
    const owned = await client
      .trx("onagre_local_import.identity")
      .where({ dossier_key: sample.identity.key, source_key: record.sourceKey })
      .first();
    const equivalents = opinions.filter(
      (opinion) => opinion.expert === expert && opinion.avis_date === avis_date,
    );
    if (owned) {
      if (!opinions.some((opinion) => String(opinion.id) === owned.target_id))
        throw new Error(`Previously added Onagre opinion is missing: ${record.sourceKey}`);
      expertIds.set(record.sourceKey, owned.target_id);
      continue;
    }
    if (equivalents.length === 1) {
      expertIds.set(record.sourceKey, equivalents[0].id);
      if (equivalents[0].avis !== avis && avis)
        conflicts.push({ sourceKey: record.sourceKey, reason: "different_outcome" });
      continue;
    }
    if (
      equivalents.length > 1 ||
      (!avis_date && opinions.some((opinion) => opinion.expert === expert))
    ) {
      conflicts.push({ sourceKey: record.sourceKey, reason: "ambiguous_opinion" });
      continue;
    }
    const result = await writeRecord(
      client,
      sample.identity.key,
      record.sourceKey,
      "avis_expert",
      record.values,
      { dossier: dossierId },
    );
    expertIds.set(record.sourceKey, result.targetId);
    outcomes.push(result);
    opinions.push({ ...record.values, id: result.targetId });
  }
  const attachments = await writeAttachments(client, sample, dossierId, options);
  await writeConsultations(client, sample, dossierId, expertIds, attachments.ids);
  return {
    outcomes: [...outcomes, ...attachments.outcomes],
    conflicts: [...conflicts, ...attachments.conflicts],
    unavailableAttachments: attachments.unavailable,
  };
}
