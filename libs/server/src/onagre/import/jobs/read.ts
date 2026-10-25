import type { Knex } from "knex";
import type { OnagreImportJobPage, OnagreImportRun } from "@pitchou/types/onagreImport.ts";
import { OnagreImportError, uuid } from "../policy.ts";
import { BATCH_SIZE, toPublic, type Batch, type Job } from "./model.ts";

export async function listImportJobs(db: Knex) {
  return (await db<Job>("onagre_import_job").orderBy("created_at", "desc").limit(10)).map(toPublic);
}
export async function readImportJob(db: Knex, id: string, page = 1): Promise<OnagreImportJobPage> {
  if (!Number.isSafeInteger(page) || page < 1) throw new OnagreImportError("Page invalide.");
  const job = await db<Job>("onagre_import_job")
    .where({ id: uuid(id) })
    .first();
  if (!job) throw new OnagreImportError("Opération introuvable.", 404);
  const pages = Math.max(1, Math.ceil(job.total / BATCH_SIZE));
  page = Math.min(page, pages);
  const batch = await db<Batch>("onagre_import_batch")
    .where({ job_id: id, position: page - 1 })
    .first();
  let records: OnagreImportJobPage["records"] = batch?.preview?.records ?? [];
  if (batch?.run_id) {
    const run = await db<{ id: string; report: OnagreImportRun }>("onagre_import_run")
      .where({ id: batch.run_id })
      .first();
    records = run!.report.outcomes.map((outcome) => ({
      ...outcome,
      name:
        batch.preview!.records.find((record) => record.recordId === outcome.recordId)?.name ?? null,
      code:
        batch.preview!.records.find((record) => record.recordId === outcome.recordId)?.code ?? null,
    }));
  }
  return { job: toPublic(job), records, page, pages };
}
// Stream one batch at a time so a full report never occupies the server heap.
export async function* exportImportJob(db: Knex, id: string) {
  const job = await db<Job>("onagre_import_job")
    .where({ id: uuid(id) })
    .first();
  if (!job) throw new OnagreImportError("Opération introuvable.", 404);
  yield JSON.stringify({ kind: "job", job: toPublic(job), context: job.context }) + "\n";
  const positions = await db("onagre_import_batch")
    .where({ job_id: id })
    .orderBy("position")
    .pluck("position");
  for (const position of positions) {
    const batch = await db<Batch>("onagre_import_batch").where({ job_id: id, position }).first();
    const run = batch?.run_id
      ? await db("onagre_import_run").where({ id: batch.run_id }).first("report")
      : null;
    yield (
      JSON.stringify({
        kind: "batch",
        position,
        preview: batch?.preview,
        report: run?.report ?? null,
      }) + "\n"
    );
  }
}
