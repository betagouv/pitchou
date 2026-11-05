import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";
import type { capture } from "../capture.ts";
import { writeRun } from "../writer.ts";
import { getImportAvailability, OnagreImportError, POLICY, SOURCE_INSTANCE } from "../policy.ts";
import type { Job, Batch } from "./model.ts";
type Captured = Awaited<ReturnType<typeof capture>>;
export function makePreview(job: Job, current: Captured): OnagreImportPreview {
  return {
    previewId: randomUUID(),
    createdAt: new Date().toISOString(),
    expiresAt: "9999-12-31T23:59:59.999Z",
    sourceInstance: SOURCE_INSTANCE,
    snapshotId: job.snapshot_id,
    snapshotFingerprint: String(current.frozen.snapshot.fingerprint),
    policy: POLICY,
    mappingHash: current.mappingHash,
    inputHash: current.inputHash,
    targetHash: current.targetHash,
    availability: getImportAvailability(),
    records: current.records,
  };
}

export async function saveAnalysis(
  batchTrx: Knex.Transaction,
  job: Job,
  batch: Batch,
  current: Captured,
  preview: OnagreImportPreview,
) {
  const counts = { ...job.counts };
  for (const record of preview.records) counts[record.status]++;
  await batchTrx("onagre_import_batch")
    .where({ job_id: job.id, position: batch.position })
    .update({
      preview: JSON.stringify(preview),
      frozen_input: JSON.stringify({
        sources: current.frozen.sources,
        targets: current.frozen.targets,
      }),
    });
  const analyzed = job.analyzed + batch.record_ids.length;
  await batchTrx("onagre_import_job")
    .where({ id: job.id })
    .update({
      counts: JSON.stringify(counts),
      analyzed,
      status: analyzed === job.total ? "review" : "analyzing",
      updated_at: batchTrx.fn.now(),
    });
}
export async function applyBatch(
  batchTrx: Knex.Transaction,
  job: Job,
  batch: Batch,
  current: Captured,
  preview: OnagreImportPreview,
) {
  const counts = { ...job.counts };
  if (!batch.preview) throw new OnagreImportError("Analyse du lot manquante.", 409);
  // Eligibility is frozen by the completed analysis. Changed rows require a new analysis.
  for (const record of preview.records) {
    const original = batch.preview.records.find((row) => row.recordId === record.recordId)!;
    if (original.status !== "ready") Object.assign(record, original);
    else if (
      original.sourceHash !== record.sourceHash ||
      original.targetHash !== record.targetHash ||
      record.status !== "ready"
    ) {
      record.status = "conflict";
      record.issues.push(
        "Cette demande ou sa cible a changé depuis l'analyse. Aucun dossier créé ; relancez une analyse.",
      );
    }
  }
  const ids = preview.records
    .filter((record) => record.status === "ready")
    .map((record) => record.recordId);
  const run = await writeRun(
    batchTrx,
    job.apply_actor_id!,
    { ...current.frozen, preview },
    ids,
    job.id,
  );
  for (const record of batch.preview.records) counts[record.status]--;
  for (const outcome of run.outcomes) counts[outcome.status]++;
  await batchTrx("onagre_import_batch")
    .where({ job_id: job.id, position: batch.position })
    .update({ run_id: run.runId });
  const processed = job.processed + batch.record_ids.length;
  await batchTrx("onagre_import_job")
    .where({ id: job.id })
    .update({
      counts: JSON.stringify(counts),
      processed,
      status: processed === job.total ? "completed" : "importing",
      updated_at: batchTrx.fn.now(),
    });
}
