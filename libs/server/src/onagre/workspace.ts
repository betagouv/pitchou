import { loadHistory } from "./history.ts";
import { loadMappings } from "./workbook.ts";
import { fieldRelations } from "@pitchou/common/onagre/constraints.ts";
import type { Knex } from "knex";
import type { OnagreTable, OnagreSharedRule } from "@pitchou/types/onagre.ts";
import { directDatabaseConnection as db } from "../database.ts";
import { compareSnapshots, browseDemandes, sourceDiagnostics } from "./queries.ts";
import { browseSourceRows } from "./sourceRows.ts";

type Snapshot = {
  id: number;
  filename: string;
  fingerprint: string;
  created_at: Date;
  tables: OnagreTable[];
  records_complete: boolean;
};
export async function loadWorkspace(url: URL, connection: Knex = db) {
  const sharedRules = await connection<OnagreSharedRule>("onagre_shared_rule")
    .select("*")
    .orderBy("key");
  const snapshots = await connection<Snapshot>("onagre_snapshot")
    .select("id", "filename", "fingerprint", "created_at", "tables", "records_complete")
    .orderBy("id", "desc");
  const selected =
    snapshots.find((s) => String(s.id) === url.searchParams.get("snapshot")) ?? snapshots[0];
  const mappings = await loadMappings(connection);
  if (selected)
    for (const mapping of mappings) {
      if (mapping.key.startsWith("field:"))
        mapping.relations = fieldRelations(selected.tables, mapping.section, mapping.label);
    }
  const targets: { table_name: string; column_name: string; data_type: string }[] =
    await connection("information_schema.columns")
      .select("table_name", "column_name", "data_type")
      .where({ table_schema: "public" })
      .whereNot("table_name", "like", "onagre_%")
      .orderBy(["table_name", "ordinal_position"]);
  if (!selected)
    return {
      snapshots,
      selected: null,
      mappings,
      sharedRules,
      targets,
      comparison: null,
      diagnostics: null,
      dossiers: [],
      dossierCount: 0,
      dossier: null,
      history: [],
      explorer: null,
    };
  const comparison = await compareSnapshots(
    connection,
    selected.id,
    snapshots.find((s) => s.id < selected.id)?.id,
  );
  const { dossiers, dossierCount, dossier } = await browseDemandes(connection, selected.id, url);
  const history = await loadHistory(connection);
  return {
    snapshots,
    selected,
    mappings,
    sharedRules,
    targets,
    comparison,
    diagnostics: await sourceDiagnostics(connection, selected.id),
    dossiers,
    dossierCount,
    dossier,
    history: history.slice(0, 30),
    explorer:
      ["dump", "source"].includes(url.searchParams.get("tab") ?? "") && selected.records_complete
        ? await browseSourceRows(connection, selected.id, selected.tables, url)
        : null,
  };
}
