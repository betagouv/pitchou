import assert from "node:assert/strict";
import { readDocumentSheets } from "@pitchou/common/onagre/documents.ts";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  browseDocument,
  storeDocument,
  type PreparedDocument,
} from "@pitchou/server/onagre/documents.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
try {
  const sheets = readDocumentSheets(
    "test.csv",
    Buffer.from(
      'Nom\tValeur\nÉlodie\t0\n\n"<script>"\tFalse\n"texte, entre guillemets"\t"sur deux\nlignes"\n',
    ),
  );
  assert.equal(sheets[0].rows.length, 4);
  assert.equal(sheets[0].rows[1].cells[0], "Élodie");
  assert.equal(sheets[0].rows[2].row_number, 4);
  assert.equal(sheets[0].rows[2].cells[0], "<script>");
  assert.equal(sheets[0].rows[3].cells[1], "sur deux\nlignes");
  await db.transaction(async (trx) => {
    const before = await trx("onagre_mapping").select("key", "version", "status").orderBy("key");
    const [snapshot] = await trx("onagre_snapshot")
      .insert({
        fingerprint: "document-check",
        filename: "test",
        workbook_fingerprint: "test",
        tables: "[]",
        workbook_mappings: "[]",
      })
      .returning("id");
    const document: PreparedDocument = {
      filename: "test.csv",
      fingerprint: "a".repeat(64),
      size: 4,
      mime: "text/csv",
      review: {
        filename: "test.csv",
        category: "Test",
        summary: "Test",
        previous: "Non chargé",
        decision: "Référence",
        reason: "Test",
        links: [],
        storeOriginal: true,
      },
      snapshot_id: snapshot.id,
      original: Buffer.from("test"),
      text: null,
      sheets: [
        {
          index: 0,
          name: "Test",
          columns: ["A"],
          rows: Array.from({ length: 55 }, (_, i) => ({
            row_number: i + 1,
            cells: [i === 30 ? "100%_é" : "value " + i],
          })),
        },
      ],
    };
    assert.equal((await storeDocument(trx, document)).created, true);
    assert.equal((await storeDocument(trx, document)).created, false);
    const row = await trx("onagre_document").where({ filename: "test.csv" }).first();
    assert.equal(row.original.toString(), "test");
    assert.equal((await trx("onagre_document_row").where({ document_id: row.id })).length, 55);
    const url = new URL(`http://localhost/?document=${row.id}&sourcePage=2`);
    assert.equal((await browseDocument(trx, url))?.rows[0].row_number, 26);
    url.searchParams.set("sourceSearch", "%_");
    const result = await browseDocument(trx, url);
    assert.equal(result?.total, 1);
    assert.equal(result?.page, 1);
    assert.equal(result?.rows[0].cells[0], "100%_é");
    url.searchParams.set("document", "invalid");
    assert.equal(await browseDocument(trx, url), null);
    // A changed original is retained as another version, not an overwrite.
    assert.equal(
      (
        await storeDocument(trx, {
          ...document,
          fingerprint: "b".repeat(64),
          original: Buffer.from("next"),
        })
      ).created,
      true,
    );
    assert.deepEqual(
      await trx("onagre_mapping").select("key", "version", "status").orderBy("key"),
      before,
    );
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    "Passed UTF-8/tab-separated parsing, preserved row numbers/cells, original bytes, replay, new file version, pagination, literal search and untouched decisions. Fixtures rolled back.",
  );
} finally {
  await db.destroy();
}
