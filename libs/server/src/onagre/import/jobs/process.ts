import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { getSessionUser } from "../../../users.ts";
import { capture } from "../capture.ts";
import { assertImportEnabled, OnagreImportError } from "../policy.ts";
import { assertContext, assertRehearsal, type Batch, type Job } from "./model.ts";

import { makePreview, saveAnalysis, applyBatch } from "./batches.ts";

export async function processImportJob(db: Knex): Promise<boolean> {
  assertRehearsal();
  return db.transaction(async (trx) => {
    await trx.raw("SET LOCAL statement_timeout = '15s'");
    await trx.raw("SET LOCAL lock_timeout = '3s'");
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    const job = await trx<Job>("onagre_import_job")
      .whereIn("status", ["analyzing", "importing"])
      .orderBy("created_at")
      .forUpdate()
      .skipLocked()
      .first();
    if (!job) return false;
    try {
      // A savepoint makes a failed batch atomic, including dossier and ledger writes.
      await trx.transaction((batchTrx) => processBatch(batchTrx, job));
    } catch (cause) {
      const message =
        cause instanceof OnagreImportError
          ? cause.message
          : "Le lot a échoué et a été annulé. Les lots terminés sont conservés. Relancez une analyse pour poursuivre.";
      await trx("onagre_import_job")
        .where({ id: job.id })
        .update({ status: "failed", error: message, updated_at: trx.fn.now() });
      // Never log source data or query parameters from a database exception.
      if (!(cause instanceof OnagreImportError))
        console.error("Onagre batch failed", {
          jobId: job.id,
          code: (cause as { code?: string })?.code ?? "unknown",
        });
    }
    return true;
  });
}

async function lockImportTables(trx: Knex.Transaction) {
  await trx.raw("select pg_advisory_xact_lock(29102026)");
  await trx.raw(`LOCK TABLE onagre_snapshot, onagre_source_demande, onagre_source_row, activite, activite_label, onagre_mapping,
    onagre_mapping_revision, onagre_shared_rule, onagre_shared_rule_revision IN SHARE MODE`);
  await trx.raw("LOCK TABLE dossier, onagre_import_identity IN SHARE ROW EXCLUSIVE MODE");
}

async function processBatch(batchTrx: Knex.Transaction, job: Job) {
  const applying = job.status === "importing";
  const actor = await getSessionUser(
    (applying ? job.apply_actor_id! : job.actor_id) as UserId,
    batchTrx,
  );
  if (
    !actor?.permissions.includes("admin:access") ||
    (applying && !actor.permissions.includes("admin:onagre:manage"))
  )
    throw new OnagreImportError(
      "Le compte à l'origine de l'opération n'a plus les droits nécessaires.",
      403,
    );
  if (applying) assertImportEnabled();
  const pending = batchTrx<Batch>("onagre_import_batch")
    .where({ job_id: job.id })
    .orderBy("position");
  const batch = await (
    applying ? pending.whereNull("run_id") : pending.whereNull("preview")
  ).first();
  if (!batch) {
    await batchTrx("onagre_import_job")
      .where({ id: job.id })
      .update({ status: applying ? "completed" : "review", updated_at: batchTrx.fn.now() });
    return;
  }
  if (applying) await lockImportTables(batchTrx);
  const current = await capture(batchTrx, job.snapshot_id, batch.record_ids);
  assertContext(job, current.frozen);

  const preview = makePreview(job, current);
  if (applying) await applyBatch(batchTrx, job, batch, current, preview);
  else await saveAnalysis(batchTrx, job, batch, current, preview);
}
