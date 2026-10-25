import { resumeInNewProcess } from "./resume.ts";
import assert from "node:assert/strict";
import {
  createImportJob,
  changeImportJob,
  processImportJob,
  readImportJob,
  exportImportJob,
} from "@pitchou/server/onagre/import/jobs.ts";
import { type Database, snapshot, counts, enable } from "./fixtures.ts";

export async function verifyJobs(db: Database) {
  enable();
  const [actor] = await db("auth_user")
    .insert({ email: "bulk-import@example.invalid", active: true, permissions_configured: true })
    .returning("id");
  await db("auth_permission").insert(
    ["admin:access", "admin:onagre:manage"].map((permission) => ({
      user_id: actor.id,
      permission,
    })),
  );
  const start = (id: number) => db.transaction((trx) => createImportJob(trx, actor.id, id));
  const act = (id: string, action: "import" | "cancel") =>
    db.transaction((trx) => changeImportJob(trx, actor.id, id, action));
  const drain = async () => {
    for (let i = 0; i < 20; i++) if (!(await processImportJob(db))) return;
    throw new Error("Worker did not drain");
  };
  const id = await snapshot(
    db,
    Array.from({ length: 205 }, (_, i) => ({
      id: 10000 + i,
      ...(i === 204 ? { demande: { datereception: null } } : {}),
    })),
  );
  const before = await counts(db);
  const job = await start(id);
  await assert.rejects(start(id), /déjà ouverte/u);
  await assert.rejects(act(job.id, "import"), /terminée/u);
  await processImportJob(db);
  assert.equal((await readImportJob(db, job.id)).job.analyzed, 100);
  // Resume in a separate Node process, without the originating process or preview cache.
  resumeInNewProcess();
  let page = await readImportJob(db, job.id);
  assert.equal(page.job.status, "review");
  assert.equal(page.job.counts.ready, 204);
  assert.equal(page.job.counts.blocked, 1);
  assert.deepEqual(
    await counts(db),
    before,
    "analysis creates no dossiers, runs, notifications or identities",
  );
  await act(job.id, "import");
  await Promise.all([processImportJob(db), processImportJob(db)]);
  await drain();
  page = await readImportJob(db, job.id, 3);
  assert.equal(page.job.status, "completed");
  assert.equal(page.job.counts.created, 204);
  assert.equal(page.job.processed, 205);
  assert.equal(page.records.length, 5);
  const after = await counts(db);
  assert.equal(after.dossier - before.dossier, 204);
  assert.equal(after.onagre_import_identity - before.onagre_import_identity, 204);
  for (const table of [
    "notification",
    "email_notification_outbox",
    "action_dossier",
    "evenement_phase_dossier",
    "edge_groupe_instructeurs__dossier",
    "edge_personne_follows_dossier",
  ])
    assert.equal(after[table], before[table], table);
  assert.equal((await act(job.id, "import")).status, "completed", "double apply is harmless");
  await verifyExport(db, job.id);
  const rerun = await start(id);
  await drain();
  assert.equal((await readImportJob(db, rerun.id)).job.counts.already_imported, 204);
  await act(rerun.id, "import");
  await drain();
  assert.equal((await counts(db)).dossier, after.dossier);
  console.log(
    "PASS bulk: 205 records, 3 batches, restart/resume, concurrent workers, replay, report, no notification writes",
  );
  await verifyStops(db, actor.id, start, act, drain);
}

async function verifyStops(
  db: Database,
  actorId: number,
  start: (id: number) => ReturnType<typeof createImportJob>,
  act: (id: string, action: "import" | "cancel") => ReturnType<typeof changeImportJob>,
  drain: () => Promise<void>,
) {
  const id = await snapshot(
    db,
    Array.from({ length: 102 }, (_, i) => ({ id: 11000 + i })),
  );
  const cancelled = await start(id);
  await processImportJob(db);
  await act(cancelled.id, "cancel");
  assert.equal(await processImportJob(db), false);
  assert.equal((await readImportJob(db, cancelled.id)).job.analyzed, 100);
  const stale = await start(id);
  await drain();
  await db("onagre_source_demande")
    .where({ snapshot_id: id, source_id: 11000 })
    .update({ demande: db.raw("jsonb_set(demande, '{datereception}', '\"2001-02-03\"')") });
  await act(stale.id, "import");
  await processImportJob(db);
  let status = (await readImportJob(db, stale.id)).job;
  assert.equal(status.counts.conflict, 1);
  assert.equal(status.counts.created, 99);
  await act(stale.id, "cancel");
  assert.equal(await processImportJob(db), false);
  const resumed = await start(id);
  await drain();
  assert.equal((await readImportJob(db, resumed.id)).job.counts.already_imported, 99);
  await act(resumed.id, "import");
  await db("auth_permission")
    .where({ user_id: actorId, permission: "admin:onagre:manage" })
    .delete();
  await processImportJob(db);
  status = (await readImportJob(db, resumed.id)).job;
  assert.equal(status.status, "failed");
  assert.match(status.error!, /droits/u);
  await db("auth_permission").insert({ user_id: actorId, permission: "admin:onagre:manage" });
  const changed = await start(id);
  await drain();
  await act(changed.id, "import");
  const rule = await db("onagre_shared_rule").first();
  await db("onagre_shared_rule")
    .where({ key: rule.key })
    .update({ version: rule.version + 1 });
  await processImportJob(db);
  assert.equal((await readImportJob(db, changed.id)).job.status, "failed");
  const rollback = await start(id);
  await drain();
  await act(rollback.id, "import");
  // First batch contains only blocked/already-imported rows.
  await processImportJob(db);
  const before = await counts(db);
  await db.raw(
    "ALTER TABLE onagre_import_identity ADD CONSTRAINT bulk_failure CHECK (source_id <> 11101)",
  );
  await processImportJob(db);
  assert.equal((await readImportJob(db, rollback.id)).job.status, "failed");
  assert.deepEqual(
    await counts(db),
    before,
    "deliberate second-row failure rolls back the whole batch and its report",
  );
  await db.raw("ALTER TABLE onagre_import_identity DROP CONSTRAINT bulk_failure");
  await verifyDisabled(db, id, start, act, drain);
  console.log(
    "PASS bulk: cancellation, partial rerun, stale source, revoked permissions, mapping changes, atomic batch rollback, disabled writes",
  );
}

async function verifyExport(db: Database, id: string) {
  const exported = [];
  for await (const line of exportImportJob(db, id)) exported.push(JSON.parse(line));
  assert.equal(exported.length, 4);
  assert.equal(exported[0].context.policy.version, "experimental-skeleton-v1");
}

async function verifyDisabled(
  db: Database,
  id: number,
  start: (id: number) => ReturnType<typeof createImportJob>,
  act: (id: string, action: "import" | "cancel") => ReturnType<typeof changeImportJob>,
  drain: () => Promise<void>,
) {
  const disabled = await start(id);
  await drain();
  process.env.ONAGRE_IMPORT_ENABLED = "false";
  await assert.rejects(act(disabled.id, "import"), /activé/u);
  enable();
  await act(disabled.id, "import");
  process.env.ONAGRE_IMPORT_ENABLED = "false";
  await processImportJob(db);
  assert.equal((await readImportJob(db, disabled.id)).job.status, "failed");
  enable();
}
