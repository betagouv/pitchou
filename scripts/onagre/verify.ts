import assert from "node:assert/strict";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { stageSnapshot } from "@pitchou/server/onagre/snapshots.ts";
import { saveMapping, MappingConflict } from "@pitchou/server/onagre/mappings.ts";
import { loadWorkspace } from "@pitchou/server/onagre/workspace.ts";
import type { OnagreBundle } from "@pitchou/types/onagre.ts";

// Run against a migrated local database. All fixture writes are rolled back.
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
try {
  await db.transaction(async (trx) => {
    const [actor] = await trx("auth_user")
      .insert({ email: "onagre-check@localhost.local", active: true })
      .returning("id");
    const bundle: OnagreBundle = {
      format: "pitchou-onagre-v1",
      filename: "test",
      fingerprint: "c".repeat(64),
      workbookFingerprint:
        (await trx("onagre_snapshot").orderBy("id").first("workbook_fingerprint"))
          ?.workbook_fingerprint ?? "d".repeat(64),
      tables: [],
      mappings: [
        {
          key: "test:nomprojet",
          section: "projet",
          label: "nomprojet",
          context: "",
          proposal: "Nom",
          confidence: "",
          notes: "Note initiale",
        },
      ],
      projets: [{ projetid: "1", nomprojet: "Projet" }],
      demandes: [
        { demandesid: "1", projetid: "1" },
        { demandesid: "2", projetid: "1" },
        { demandesid: "4", projetid: "1" },
      ],
    };
    const first = await stageSnapshot(trx, bundle);
    assert.equal(first.duplicate, false);
    assert.deepEqual(await stageSnapshot(trx, bundle), { id: first.id, duplicate: true });
    const decision = {
      key: "test:nomprojet",
      version: 1,
      target: "dossier.name",
      rule: "Copier",
      notes: "Décision",
      status: "validated" as const,
    };
    await saveMapping(trx, actor.id, decision);
    await assert.rejects(saveMapping(trx, actor.id, decision), MappingConflict);
    const next = structuredClone(bundle);
    next.fingerprint = "e".repeat(64);
    next.demandes = [
      { demandesid: "1", projetid: "1", cmtdemande: "Modification" },
      { demandesid: "3", projetid: "1" },
      { demandesid: "4", projetid: "1" },
    ];
    next.mappings[0].notes = "Une réimportation ne doit pas écraser la décision";
    const second = await stageSnapshot(trx, next);
    const state = await loadWorkspace(
      new URL(`http://localhost/onagre?snapshot=${second.id}`),
      trx,
    );
    assert.deepEqual(state.comparison, { added: 1, changed: 1, unchanged: 1, removed: 1 });
    assert.equal(state.mappings.find((m) => m.key === decision.key)?.notes, "Décision");
    assert.equal(
      (await trx("onagre_mapping_revision").where({ mapping_key: decision.key })).length,
      1,
    );
    assert.equal((await trx("onagre_source_demande").where({ snapshot_id: first.id })).length, 3);
    throw rollback;
  });
} catch (cause) {
  if (cause !== rollback) throw cause;
} finally {
  await db.destroy();
}
console.log(
  "Passed: repeat loading, snapshot differences, preserved decisions, stale edit rejection, revision history. Fixtures rolled back.",
);
