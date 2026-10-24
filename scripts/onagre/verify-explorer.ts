import type { Knex } from "knex";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { stageSnapshot } from "@pitchou/server/onagre/snapshots.ts";
import { stagePackage } from "@pitchou/server/onagre/package.ts";
import { browseSourceRows } from "@pitchou/server/onagre/sourceRows.ts";
import type { OnagreBundle, SourceRow } from "@pitchou/types/onagre.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
const content: Record<string, SourceRow[]> = {
  demandes: [{ demandesid: "1", projetid: "1" }],
  projet: [{ projetid: "1" }],
  notes: Array.from({ length: 60 }, (_, index) => ({
    id: String(index + 1),
    text: index === 0 ? "%_\\é" : index === 1 ? null : index === 2 ? "" : "Identique",
  })),
  empty: [],
};
function encoded(bundle: OnagreBundle, blocks = content) {
  return gzipSync(
    [
      JSON.stringify({ format: "pitchou-onagre-stream-v1", bundle }),
      ...Object.entries(blocks)
        .filter(([, rows]) => rows.length > 0)
        .map(([table, rows]) => JSON.stringify({ table, rows })),
    ].join("\n") + "\n",
  );
}
async function verifyQueries(trx: Knex.Transaction, snapshotId: number, bundle: OnagreBundle) {
  const browse = (params: string) =>
    browseSourceRows(
      trx,
      snapshotId,
      bundle.tables,
      new URL(`http://localhost/?table=notes&${params}`),
    );
  assert.equal((await browse("rowsPage=2"))?.rows[0].row_number, 26);
  assert.equal((await browse("rowsPage=999"))?.rows.at(-1)?.row_number, 60);
  assert.equal((await browse(`search=${encodeURIComponent("%_\\é")}`))?.total, 1);
  assert.equal((await browse("search=Identique&column=text"))?.total, 57);
  assert.equal((await browse("row=2"))?.selected?.content.text, null);
  assert.equal((await browse("row=3"))?.selected?.content.text, "");
  assert.equal((await browse("row=61"))?.selected, null);
  assert.equal(
    (
      await browseSourceRows(
        trx,
        snapshotId,
        bundle.tables,
        new URL("http://localhost/?table=empty"),
      )
    )?.total,
    0,
  );
  assert.equal(
    (
      await browseSourceRows(
        trx,
        snapshotId,
        bundle.tables,
        new URL("http://localhost/?table=';drop"),
      )
    )?.table,
    "demandes",
  );
}
try {
  await db.transaction(async (trx) => {
    const bundle: OnagreBundle = {
      format: "pitchou-onagre-v1",
      filename: "explorer-fixture",
      fingerprint: "1".repeat(64),
      workbookFingerprint:
        (await trx("onagre_snapshot").orderBy("id").first("workbook_fingerprint"))
          ?.workbook_fingerprint ?? "2".repeat(64),
      tables: Object.entries(content).map(([name, rows]) => ({
        name,
        columns: Object.keys(rows[0] ?? { id: "" }),
        count: rows.length,
        samples: rows.slice(0, 3),
      })),
      mappings: [],
      demandes: content.demandes,
      projets: content.projet,
    };
    const before = await trx("onagre_mapping").orderBy("key");
    const original = await stageSnapshot(trx, bundle);
    const run = (bytes: Buffer) => stagePackage(trx, Readable.from([bytes]), true);
    const upgraded = await run(encoded(bundle));
    assert.deepEqual(upgraded, { id: original.id, duplicate: true });
    assert.deepEqual(await run(encoded(bundle)), upgraded);
    assert.equal(
      (await trx("onagre_source_row").where({ snapshot_id: original.id }).count("* as count"))[0]
        .count,
      "62",
    );
    assert.deepEqual(await trx("onagre_mapping").orderBy("key"), before);
    await verifyQueries(trx, original.id, bundle);
    const next = { ...bundle, fingerprint: "3".repeat(64) };
    const broken = { ...content, notes: content.notes.slice(0, 2) };
    await assert.rejects(
      trx.transaction((tx) => stagePackage(tx, Readable.from([encoded(next, broken)]), true)),
      /incomplet/u,
    );
    assert.equal(
      await trx("onagre_snapshot").where({ fingerprint: next.fingerprint }).first(),
      undefined,
    );
    const invalid = { ...content, notes: [{ id: "1", unexpected: "x" }] };
    await assert.rejects(
      trx.transaction((tx) => stagePackage(tx, Readable.from([encoded(next, invalid)]), true)),
      /Ligne invalide/u,
    );
    const zipped = encoded(next);
    await assert.rejects(
      trx.transaction((tx) =>
        stagePackage(tx, Readable.from([zipped.subarray(0, zipped.length - 8)]), true),
      ),
    );
    assert.equal(
      await trx("onagre_snapshot").where({ fingerprint: next.fingerprint }).first(),
      undefined,
    );
    const future = await run(encoded(next));
    assert.notEqual(future.id, original.id);
    assert.equal(
      (await trx("onagre_source_row").where({ snapshot_id: future.id }).count("* as count"))[0]
        .count,
      "62",
    );
    throw rollback;
  });
} catch (cause) {
  if (cause !== rollback) throw cause;
} finally {
  await db.destroy();
}
console.log(
  "Passed: full snapshot upgrade, repeat and future loads, preserved mappings, pagination, literal searches, nulls, empty tables, malformed/truncated package rollback. Fixtures rolled back.",
);
