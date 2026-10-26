import type { Knex } from "knex";
import type { SourceRow } from "@pitchou/types/onagre.ts";
import type { Source } from "./state.ts";

const references = [
  ["objet", "objetid", "projet", "objetid"],
  ["motifderogation", "motifderogationid", "demande", "motifderogationid"],
  ["services", "servicesid", "projet", "servicecoordinateurid"],
] as const;

export async function captureReferences(db: Knex, snapshotId: number, sources: (Source | null)[]) {
  if (sources.length === 0) return;
  const rows: { table_name: string; content: SourceRow }[] = await db("onagre_source_row")
    .where({ snapshot_id: snapshotId })
    .whereIn(
      "table_name",
      references.map(([table]) => table),
    )
    .orderBy("table_name")
    .orderBy("row_number")
    .select("table_name", "content");
  for (const source of sources) {
    if (!source) continue;
    source.references = Object.fromEntries(
      references.map(([table, key, parent, column]) => [
        table,
        rows
          .filter(
            (row) =>
              row.table_name === table &&
              !!source[parent][column]?.trim() &&
              row.content[key] === source[parent][column],
          )
          .map((row) => row.content),
      ]),
    );
  }
}

export async function captureActivities(db: Knex) {
  return db("activite")
    .leftJoin("activite_label", { "activite.label": "activite_label.label" })
    .select(
      "activite.code",
      "activite.label",
      db.raw(
        "coalesce(activite_label.activite_code = activite.code and not activite_label.needs_review, false) as usable",
      ),
    )
    .orderBy("activite.code");
}
