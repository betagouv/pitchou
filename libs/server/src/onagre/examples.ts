import type { Knex } from "knex";
import type { OnagreTable } from "@pitchou/types/onagre.ts";

// Match String.trim(), including non-breaking spaces and Unicode separators.
const whitespace =
  " \t\n\r\v\f\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF";

export async function loadFieldExamples(connection: Knex, url: URL) {
  const requested = url.searchParams.get("snapshot");
  if (requested && (!/^\d+$/u.test(requested) || !Number.isSafeInteger(Number(requested))))
    return null;
  const query = connection("onagre_snapshot").select("id", "tables", "records_complete");
  if (requested) query.where({ id: Number(requested) });
  const snapshot = await query.orderBy("id", "desc").first();
  if (!snapshot) return null;
  const table = (snapshot.tables as OnagreTable[]).find(
    (item) => item.name === url.searchParams.get("table"),
  );
  const column = url.searchParams.get("column") ?? "";
  if (!table?.columns.includes(column)) return null;
  if (!snapshot.records_complete)
    return {
      samples: table.samples
        .map((row) => row[column])
        .filter((value) => value != null && value.trim() !== "")
        .slice(0, 3),
      complete: false,
    };
  const rows: { value: string }[] = await connection("onagre_source_row")
    .where({ snapshot_id: snapshot.id, table_name: table.name })
    .whereRaw("btrim(content ->> ?, ?) <> ''", [column, whitespace])
    .select(connection.raw("content ->> ? as value", [column]))
    .orderBy("row_number")
    .limit(3);
  return { samples: rows.map((row) => row.value), complete: true };
}
