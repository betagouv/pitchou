import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import type { OnagreImportRun, OnagreImportOutcome } from "@pitchou/types/onagreImport.ts";
import type { FrozenInput } from "./state.ts";
import { hash, POLICY, SOURCE_INSTANCE, assertImportEnabled } from "./policy.ts";

export async function writeRun(
  trx: Knex.Transaction,
  actorId: number,
  frozen: FrozenInput,
  ids: string[],
  jobId?: string,
) {
  assertImportEnabled();
  const { preview } = frozen;
  const report: OnagreImportRun = {
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    actorId,
    preview,
    recordIds: ids,
    outcomes: [],
  };
  await trx("onagre_import_run").insert({
    id: report.runId,
    ...(jobId ? { job_id: jobId } : {}),
    preview_id: preview.previewId,
    actor_id: actorId,
    snapshot_id: preview.snapshotId,
    source_instance: SOURCE_INSTANCE,
    profile_version: POLICY.version,
    mapping_hash: preview.mappingHash,
    input_hash: preview.inputHash,
    target_hash: preview.targetHash,
    frozen_input: JSON.stringify(
      jobId ? { jobId, sources: frozen.sources, targets: frozen.targets, preview } : frozen,
    ),
    report: JSON.stringify(report),
    created_at: report.createdAt,
  });
  for (const record of preview.records) {
    const outcome: OnagreImportOutcome = {
      recordId: record.recordId,
      status: record.status === "ready" ? "omitted" : record.status,
      dossierId: record.dossierId,
      issues: [...record.issues],
      omissions: [...record.omissions],
    };
    if (ids.includes(record.recordId) && record.status === "ready") {
      const [created] = await trx("dossier")
        .insert({
          name: record.name,
          depot_date: `${record.receptionDate}T00:00:00.000Z`,
          source: "onagre",
          onagre_demande_identifier: record.code,
        })
        .returning(trx.raw("to_jsonb(dossier) as content"));
      const dossier = created.content;
      const source = frozen.sources.find((row) => String(row?.source_id) === record.recordId)!;
      await trx("onagre_import_identity").insert({
        source_instance: SOURCE_INSTANCE,
        source_id: Number(record.recordId),
        dossier_id: dossier.id,
        run_id: report.runId,
        snapshot_id: preview.snapshotId,
        profile_version: POLICY.version,
        source_hash: record.sourceHash,
        target_hash: hash(dossier),
        raw_source: JSON.stringify({ demande: source.demande, projet: source.projet }),
      });
      outcome.status = "created";
      outcome.dossierId = dossier.id;
    } else if (!ids.includes(record.recordId))
      outcome.omissions.push("Demande non sélectionnée pour cette exécution.");
    report.outcomes.push(outcome);
  }
  await trx("onagre_import_run")
    .where({ id: report.runId })
    .update({ report: JSON.stringify(report) });
  return report;
}
