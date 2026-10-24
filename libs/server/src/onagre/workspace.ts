import type { Knex } from "knex";
import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
import { directDatabaseConnection as db } from "../database.ts";
import { compareSnapshots, browseDemandes, sourceDiagnostics } from "./queries.ts";

type Snapshot = {
  id: number;
  filename: string;
  fingerprint: string;
  created_at: Date;
  tables: OnagreTable[];
};
export async function loadWorkspace(url: URL, connection: Knex = db) {
  const snapshots = await connection<Snapshot>("onagre_snapshot")
    .select("id", "filename", "fingerprint", "created_at", "tables")
    .orderBy("id", "desc");
  const selected =
    snapshots.find((s) => String(s.id) === url.searchParams.get("snapshot")) ?? snapshots[0];
  const mappings = await connection<OnagreMapping>("onagre_mapping")
    .select("*")
    .orderBy(["section", "key"]);
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
      targets,
      comparison: null,
      diagnostics: null,
      dossiers: [],
      dossierCount: 0,
      dossier: null,
      history: [],
    };
  const comparison = await compareSnapshots(
    connection,
    selected.id,
    snapshots.find((s) => s.id < selected.id)?.id,
  );
  const { dossiers, dossierCount, dossier } = await browseDemandes(connection, selected.id, url);
  const history: {
    id: number;
    mapping_key: string;
    actor_id: number;
    created_at: Date;
    after: OnagreMapping;
  }[] = await connection("onagre_mapping_revision")
    .select("id", "mapping_key", "actor_id", "created_at", "after")
    .orderBy("id", "desc")
    .limit(30);
  return {
    snapshots,
    selected,
    mappings,
    targets,
    comparison,
    diagnostics: await sourceDiagnostics(connection, selected.id),
    dossiers,
    dossierCount,
    dossier,
    history,
  };
}
