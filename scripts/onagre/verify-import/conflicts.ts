import assert from "node:assert/strict";
import {
  createImportPreview,
  applyImportPreview,
  OnagreImportError,
} from "@pitchou/server/onagre/import.ts";
import { type Database, snapshot, counts } from "./fixtures.ts";

export async function verifyConflicts(db: Database, actorId: number, dossierId: number) {
  const preview = (id: number, ids = ["1"]) =>
    createImportPreview(db, { snapshotId: id, recordIds: ids }, actorId);
  const apply = (id: string, ids = ["1"]) =>
    db.transaction((trx) => applyImportPreview(trx, actorId, { previewId: id, recordIds: ids }));
  const changed = await snapshot(db, [{ id: 1, projet: { nomprojet: "Projet modifié" } }]);
  assert.equal((await preview(changed)).records[0].status, "conflict");
  await db("dossier").where({ id: dossierId }).update({ free_comment: "Modification humaine" });
  const same = await snapshot(db, [{ id: 1 }]);
  assert.equal((await preview(same)).records[0].status, "conflict");
  assert.equal(
    (await db("dossier").where({ id: dossierId }).first()).free_comment,
    "Modification humaine",
  );
  await db("dossier").insert([
    { depot_date: "2000-01-01", onagre_demande_identifier: "TEST-11" },
    { depot_date: "2000-01-01", onagre_demande_identifier: "TEST-11" },
    { depot_date: "2000-01-01", onagre_demande_identifier: "TEST-12" },
  ]);
  const legacy = await snapshot(db, [{ id: 11 }, { id: 12 }]);
  const ambiguous = await preview(legacy, ["11", "12"]);
  assert.deepEqual(
    ambiguous.records.map((r) => r.status),
    ["conflict", "conflict"],
  );
  const duplicates = await snapshot(db, [
    { id: 13 },
    { id: 14, demande: { codedemande: "TEST-13" } },
  ]);
  assert.equal((await preview(duplicates, ["13"])).records[0].status, "blocked");
  const fresh = await snapshot(db, [{ id: 21 }, { id: 22 }, { id: 23 }, { id: 24 }]);
  const staleMapping = await preview(fresh, ["21"]);
  const rule = await db("onagre_shared_rule").first();
  await db("onagre_shared_rule")
    .where({ key: rule.key })
    .update({ version: rule.version + 1 });
  const before = await counts(db);
  await assert.rejects(
    apply(staleMapping.previewId, ["21"]),
    (e: unknown) => e instanceof OnagreImportError && e.status === 409,
  );
  assert.deepEqual(await counts(db), before);
  const staleTarget = await preview(fresh, ["21"]);
  await db("dossier").insert({ depot_date: "2000-01-01", onagre_demande_identifier: "TEST-21" });
  await assert.rejects(
    apply(staleTarget.previewId, ["21"]),
    (e: unknown) => e instanceof OnagreImportError && e.status === 409,
  );
  const staleSource = await preview(fresh, ["22"]);
  await db("onagre_source_demande")
    .where({ snapshot_id: fresh, source_id: 22 })
    .update({ name: "changed staging metadata" });
  await assert.rejects(
    apply(staleSource.previewId, ["22"]),
    (e: unknown) => e instanceof OnagreImportError && e.status === 409,
  );

  await verifyAtomicity(db, actorId, fresh);
}

async function verifyAtomicity(db: Database, actorId: number, fresh: number) {
  const preview = (id: number, ids: string[]) =>
    createImportPreview(db, { snapshotId: id, recordIds: ids }, actorId);
  const apply = (id: string, ids: string[]) =>
    db.transaction((trx) => applyImportPreview(trx, actorId, { previewId: id, recordIds: ids }));
  const atomic = await preview(fresh, ["23", "24"]);
  await db.raw(`CREATE FUNCTION fail_import_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.source_id = 24 THEN RAISE EXCEPTION 'intentional ledger verification failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_import_ledger BEFORE INSERT ON onagre_import_identity FOR EACH ROW EXECUTE FUNCTION fail_import_ledger()`);
  const atomicBefore = await counts(db);
  await assert.rejects(
    apply(atomic.previewId, ["23", "24"]),
    /intentional ledger verification failure/u,
  );
  assert.deepEqual(
    await counts(db),
    atomicBefore,
    "all dossiers, identities and run must roll back on ledger failure",
  );
  await db.raw(
    "DROP TRIGGER fail_import_ledger ON onagre_import_identity; DROP FUNCTION fail_import_ledger()",
  );
  const concurrent1 = await preview(fresh, ["23"]);
  const concurrent2 = await preview(fresh, ["23"]);
  const results = await Promise.allSettled([
    apply(concurrent1.previewId, ["23"]),
    apply(concurrent2.previewId, ["23"]),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof OnagreImportError && rejected.reason.status === 409);
  assert.equal(
    Number(
      (await db("dossier").where({ onagre_demande_identifier: "TEST-23" }).count("* as count"))[0]
        .count,
    ),
    1,
  );
}
