import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { capture } from "../capture.ts";
import { assertImportEnabled, hash, OnagreImportError, positiveInteger, uuid } from "../policy.ts";
import {
  assertRehearsal,
  BATCH_SIZE,
  contextOf,
  emptyCounts,
  toPublic,
  type Job,
} from "./model.ts";

export async function createImportJob(trx: Knex.Transaction, actorId: number, snapshotId: number) {
  assertRehearsal();
  positiveInteger(snapshotId);
  await trx.raw("SET LOCAL statement_timeout = '15s'");
  // Serialize against other starts even when no active row exists yet.
  await trx.raw("select pg_advisory_xact_lock(31102026)");
  const active = await trx<Job>("onagre_import_job")
    .whereIn("status", ["analyzing", "review", "importing"])
    .first();
  if (active)
    throw new OnagreImportError(
      "Une opération est déjà ouverte. Consultez-la ou arrêtez-la avant de recommencer.",
      409,
    );
  const captured = await capture(trx, snapshotId, []);
  if (!captured.frozen.snapshot.records_complete)
    throw new OnagreImportError("Chargez un dump complet avant de lancer l'analyse.");
  const ids = (
    await trx("onagre_source_demande")
      .where({ snapshot_id: snapshotId })
      .orderBy("source_id")
      .pluck("source_id")
  ).map(String);
  const context = contextOf(captured.frozen);
  const id = randomUUID();
  const [job] = await trx<Job>("onagre_import_job")
    .insert({
      id,
      actor_id: actorId,
      snapshot_id: snapshotId,
      status: ids.length > 0 ? "analyzing" : "review",
      total: ids.length,
      counts: emptyCounts(),
      context,
      context_hash: hash(context),
    })
    .returning("*");
  const batches = [];
  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE)
    batches.push({
      job_id: id,
      position: offset / BATCH_SIZE,
      record_ids: JSON.stringify(ids.slice(offset, offset + BATCH_SIZE)),
    });
  if (batches.length > 0) await trx("onagre_import_batch").insert(batches);
  return toPublic(job);
}

export async function changeImportJob(
  trx: Knex.Transaction,
  actorId: number,
  id: string,
  action: "import" | "cancel",
) {
  assertRehearsal();
  const job = await trx<Job>("onagre_import_job")
    .where({ id: uuid(id) })
    .forUpdate()
    .first();
  if (!job) throw new OnagreImportError("Opération introuvable.", 404);
  if (action === "import") {
    assertImportEnabled();
    if (["importing", "completed"].includes(job.status)) return toPublic(job);
    if (job.status !== "review" || job.analyzed !== job.total)
      throw new OnagreImportError("L'analyse doit être terminée avant l'import.", 409);
    await trx("onagre_import_job")
      .where({ id })
      .update({ status: "importing", apply_actor_id: actorId, updated_at: trx.fn.now() });
  } else {
    if (["completed", "cancelled", "failed"].includes(job.status)) return toPublic(job);
    await trx("onagre_import_job")
      .where({ id })
      .update({ status: "cancelled", updated_at: trx.fn.now() });
  }
  return toPublic((await trx<Job>("onagre_import_job").where({ id }).first())!);
}
