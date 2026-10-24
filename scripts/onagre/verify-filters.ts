import assert from "node:assert/strict";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { browseSourceRows } from "@pitchou/server/onagre/sourceRows.ts";
import type { FilterOperator, SourceFilter } from "@pitchou/common/onagre/filters.ts";
import type { OnagreTable } from "@pitchou/types/onagre.ts";

if (!["localhost", "127.0.0.1", "::1"].includes(new URL(process.env.DATABASE_URL!).hostname))
  throw new Error("Use a local test database.");
const rows = [
  { id: "1", name: "Alpha", amount: "2", date: "2024-01-01", note: null },
  { id: "2", name: "ALPHA", amount: "10", date: "2024-02-29", note: "" },
  { id: "3", name: "Beta", amount: "-3.5", date: "2025-01-01", note: "100%_\\x" },
  { id: "4", name: "alphaBeta", amount: "invalid", date: "invalid", note: "quote';--" },
  { id: "5", name: null, amount: null, date: null, note: null },
  { id: "6", name: "", amount: "", date: "", note: "" },
];
const tables: OnagreTable[] = [
  { name: "values", columns: Object.keys(rows[0]), count: rows.length, samples: [] },
];
const filter = (column: string, operator: FilterOperator, value = ""): SourceFilter => ({
  column,
  operator,
  value,
});
const rollback = new Error("verification rollback");
try {
  await db.transaction(async (trx) => {
    const [snapshot] = await trx("onagre_snapshot")
      .insert({
        fingerprint: "5".repeat(64),
        workbook_fingerprint: "6".repeat(64),
        filename: "filters-fixture",
        tables: JSON.stringify(tables),
        workbook_mappings: "[]",
        records_complete: true,
      })
      .returning("id");
    await trx("onagre_source_row").insert(
      rows.map((content, i) => ({
        snapshot_id: snapshot.id,
        table_name: "values",
        row_number: i + 1,
        content,
      })),
    );
    const browse = (filters: unknown, search = "") =>
      browseSourceRows(
        trx,
        snapshot.id,
        tables,
        new URL(
          `http://localhost/?${new URLSearchParams({ table: "values", filters: JSON.stringify(filters), search })}`,
        ),
      );
    const check = async (filters: SourceFilter[], ids: string[], search = "") => {
      const result = await browse(filters, search);
      assert.equal(result?.filterError, null);
      assert.deepEqual(
        result?.rows.map((row) => row.content.id),
        ids,
      );
      assert.equal(result?.total, ids.length);
    };
    await check([filter("name", "eq", "Alpha")], ["1"]);
    await check([filter("name", "neq", "Alpha")], ["2", "3", "4", "6"]);
    await check([filter("name", "contains", "alpha")], ["1", "2", "4"]);
    await check([filter("name", "not_contains", "alpha")], ["3", "6"]);
    await check([filter("name", "starts", "al")], ["1", "2", "4"]);
    await check([filter("name", "ends", "TA")], ["3", "4"]);
    await check([filter("name", "null")], ["5"]);
    await check([filter("name", "not_null")], ["1", "2", "3", "4", "6"]);
    await check([filter("name", "empty")], ["6"]);
    await check([filter("name", "not_empty")], ["1", "2", "3", "4"]);
    await check([filter("amount", "gt", "2")], ["2"]);
    await check([filter("amount", "gte", "2")], ["1", "2"]);
    await check([filter("amount", "lt", "2")], ["3"]);
    await check([filter("amount", "lte", "2")], ["1", "3"]);
    await check([filter("date", "before", "2024-02-29")], ["1"]);
    await check([filter("date", "after", "2024-02-29")], ["3"]);
    await check([filter("name", "contains", "ALPHA"), filter("amount", "gt", "2")], ["2"]);
    await check([filter("name", "contains", "ALPHA")], ["2"], "10");
    await check([filter("note", "contains", "%_\\")], ["3"]);
    await check([filter("note", "eq", "quote';--")], ["4"]);
    for (const invalid of [
      [filter("missing", "eq", "x")],
      [{ column: "name", operator: "= 1; --", value: "x" }],
      [filter("amount", "gt", "invalid")],
      [filter("date", "before", "2024-02-30")],
      Array.from({ length: 13 }, () => filter("name", "eq", "Alpha")),
    ]) {
      const result = await browse(invalid);
      assert.ok(result?.filterError);
      assert.equal(result?.total, 0);
    }
    throw rollback;
  });
} catch (cause) {
  if (cause !== rollback) throw cause;
} finally {
  await db.destroy();
}
console.log(
  "Passed: exact/negative/text/numeric/date/null/empty filters, combined conditions and search, escaped literals, invalid filters rejected. Fixtures rolled back.",
);
