import assert from "node:assert/strict";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { loadFieldExamples } from "@pitchou/server/onagre/examples.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local test database.");
const rollback = new Error("verification rollback");
try {
  await db.transaction(async (trx) => {
    const tables = [
      {
        name: "example_values",
        columns: ["value", "empty", "sparse"],
        count: 10,
        samples: [{ value: null }, { value: "" }, { value: " \t" }],
      },
    ];
    const [snapshot] = await trx("onagre_snapshot")
      .insert({
        fingerprint: "examples-check",
        filename: "test",
        workbook_fingerprint: "test",
        tables: JSON.stringify(tables),
        workbook_mappings: "[]",
        records_complete: true,
      })
      .returning("id");
    const values = [
      null,
      "",
      " \t\n",
      "\u00A0\u202F\uFEFF",
      "  first  ",
      "0",
      "false",
      "fourth",
      null,
      "",
    ];
    await trx("onagre_source_row").insert(
      values.map((value, i) => ({
        snapshot_id: snapshot.id,
        table_name: "example_values",
        row_number: i + 1,
        content: { value, empty: i % 2 ? null : " ", sparse: i === 8 ? "only" : null },
      })),
    );
    const url = new URL(
      `http://localhost/?snapshot=${snapshot.id}&table=example_values&column=value`,
    );
    assert.deepEqual(await loadFieldExamples(trx, url), {
      samples: ["  first  ", "0", "false"],
      complete: true,
    });
    url.searchParams.set("column", "sparse");
    assert.deepEqual((await loadFieldExamples(trx, url))?.samples, ["only"]);
    url.searchParams.set("column", "empty");
    assert.deepEqual((await loadFieldExamples(trx, url))?.samples, []);
    url.searchParams.set("column", "unknown");
    assert.equal(await loadFieldExamples(trx, url), null);
    url.searchParams.set("column", "value");
    url.searchParams.set("table", "unknown");
    assert.equal(await loadFieldExamples(trx, url), null);
    url.searchParams.set("table", "example_values");
    url.searchParams.set("snapshot", "invalid");
    assert.equal(await loadFieldExamples(trx, url), null);
    url.searchParams.set("snapshot", String(snapshot.id));
    await trx("onagre_snapshot").where({ id: snapshot.id }).update({ records_complete: false });
    assert.deepEqual(await loadFieldExamples(trx, url), { samples: [], complete: false });
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) throw error;
  console.log(
    "Passed full-table examples, three-value limit, blanks/Unicode whitespace, unchanged values, zero/false, sparse/empty fields, invalid selection and legacy samples. Fixtures rolled back.",
  );
} finally {
  await db.destroy();
}
