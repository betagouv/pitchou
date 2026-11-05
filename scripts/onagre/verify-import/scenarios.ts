import assert from "node:assert/strict";
import {
  createImportPreview,
  applyImportPreview,
  readImportRun,
  OnagreImportError,
} from "@pitchou/server/onagre/import.ts";
import { type Database, snapshot, counts, enable } from "./fixtures.ts";
import { verifyConflicts } from "./conflicts.ts";

export async function verify(db: Database) {
  const [actor] = await db("auth_user")
    .insert({ email: "import-verification@example.invalid" })
    .returning("id");
  const actorId = actor.id as number;
  const preview = (id: number, ids = ["1"]) =>
    createImportPreview(db, { snapshotId: id, recordIds: ids }, actorId);
  const apply = (id: string, ids = ["1"]) =>
    db.transaction((trx) => applyImportPreview(trx, actorId, { previewId: id, recordIds: ids }));
  const first = await snapshot(db, [
    { id: 1 },
    { id: 2, demande: { datereception: null } },
    { id: 3, demande: { datereception: "2025-02-30" } },
    { id: 4, projet: { nomprojet: "x".repeat(1024) } },
  ]);
  delete process.env.ONAGRE_DEPLOYMENT_ROLE;
  delete process.env.ONAGRE_IMPORT_ENABLED;
  const before = await counts(db);
  const disabled = await preview(first, ["1", "2", "3", "4", "5"]);
  assert.equal(disabled.availability.enabled, false);
  assert.deepEqual(
    disabled.records.map((r) => r.status),
    ["ready", "blocked", "blocked", "blocked", "blocked"],
  );
  assert.deepEqual(await counts(db), before, "preview must not write even audit rows");
  await assert.rejects(
    apply(disabled.previewId),
    (e: unknown) => e instanceof OnagreImportError && e.status === 403,
  );
  await assert.rejects(
    preview(
      first,
      Array.from({ length: 11 }, (_, i) => String(i + 1)),
    ),
  );
  await assert.rejects(preview(first, ["1", "1"]));
  for (const [key, value] of [
    ["ONAGRE_DEPLOYMENT_ROLE", "preparation"],
    ["ONAGRE_DEPLOYMENT_ROLE", "production"],
    ["ONAGRE_IMPORT_ENABLED", "false"],
    ["ONAGRE_SOURCE_INSTANCE", "snapshot-1"],
  ]) {
    enable();
    process.env[key] = value;
    await assert.rejects(
      apply(disabled.previewId),
      (e: unknown) => e instanceof OnagreImportError && e.status === 403,
    );
  }
  enable();
  await assert.rejects(
    db.transaction((trx) =>
      applyImportPreview(trx, actorId + 1, { previewId: disabled.previewId, recordIds: ["1"] }),
    ),
  );
  await assert.rejects(apply(disabled.previewId, ["2"]));
  const dossierId = await verifyWrites(db, actorId, disabled.previewId, before);
  await verifyConflicts(db, actorId, dossierId);
}

async function verifyWrites(
  db: Database,
  actorId: number,
  previewId: string,
  before: Record<string, number>,
) {
  const preview = (id: number) =>
    createImportPreview(db, { snapshotId: id, recordIds: ["1"] }, actorId);
  const apply = (id: string) =>
    db.transaction((trx) => applyImportPreview(trx, actorId, { previewId: id, recordIds: ["1"] }));
  const run = await apply(previewId);
  assert.equal(run.outcomes[0].status, "created");
  const dossier = await db("dossier").where({ id: run.outcomes[0].dossierId }).first();
  assert.equal(dossier.source, "onagre");
  assert.equal(dossier.depot_date.toISOString(), "1998-02-03T00:00:00.000Z");
  assert.equal(dossier.description, null);
  assert.equal(dossier.primary_department, null);
  assert.equal(dossier.porteur_de_projet, null);
  const after = await counts(db);
  for (const table of Object.keys(before).filter(
    (key) => !["dossier", "onagre_import_identity", "onagre_import_run"].includes(key),
  ))
    assert.equal(after[table], before[table], `unexpected write to ${table}`);
  const identity = await db("onagre_import_identity").first();
  assert.equal(identity.raw_source.projet.description, "Donnée brute non importée");
  assert.deepEqual(await apply(previewId), run, "same preview retry must reuse its report");
  assert.deepEqual(await readImportRun(db, run.runId), run);
  const second = await snapshot(db, [{ id: 1 }]);
  const replay = await preview(second);
  assert.equal(replay.records[0].status, "already_imported");
  assert.equal((await apply(replay.previewId)).outcomes[0].status, "already_imported");
  assert.equal(
    (await counts(db)).dossier,
    1,
    "same stable identity across snapshots cannot duplicate",
  );
  return dossier.id as number;
}
