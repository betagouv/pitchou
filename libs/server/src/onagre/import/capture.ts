import type { Knex } from "knex";
import type { FrozenInput, Source } from "./state.ts";
import { hash, OnagreImportError, POLICY, SOURCE_INSTANCE } from "./policy.ts";
import { inspectRecord } from "./records.ts";
import { captureTargets } from "./targets.ts";
import { captureActivities, captureReferences } from "./references.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";

export async function capture(connection: Knex, snapshotId: number, ids: string[]) {
  await connection.raw("SET LOCAL TIME ZONE 'UTC'");
  const snapshot = await connection("onagre_snapshot").where({ id: snapshotId }).first();
  if (!snapshot) throw new OnagreImportError("Snapshot introuvable.", 404);
  // Keep reads sequential: this also runs on a single transaction connection.
  const mappings = await connection<OnagreMapping>("onagre_mapping").select("*").orderBy("key");
  const activities = await captureActivities(connection);
  const sharedRules = await connection("onagre_shared_rule").select("*").orderBy("key");
  const mappingRevisions = await connection("onagre_mapping_revision")
    .select("mapping_key")
    .max("id as id")
    .groupBy("mapping_key")
    .orderBy("mapping_key");
  const sharedRuleRevisions = await connection("onagre_shared_rule_revision")
    .select("rule_key")
    .max("id as id")
    .groupBy("rule_key")
    .orderBy("rule_key");
  const schema = await connection("information_schema.columns")
    .where({ table_schema: "public", table_name: "dossier" })
    .select("column_name", "data_type", "is_nullable", "column_default", "character_maximum_length")
    .orderBy("ordinal_position");
  const rows: Source[] = await connection("onagre_source_demande")
    .where({ snapshot_id: snapshotId })
    .whereIn("source_id", ids.map(Number))
    .select("*");
  const sources = ids.map((id) => rows.find((row) => row.source_id === Number(id)) ?? null);
  await captureReferences(connection, snapshotId, sources);
  const targets = await captureTargets(connection, snapshotId, ids, sources);
  const records = ids.map((id, i) =>
    inspectRecord(id, sources[i], targets[i], schema, mappings, activities),
  );
  const frozen: Omit<FrozenInput, "preview"> = {
    snapshot,
    mappings,
    mappingRevisions,
    sharedRules,
    sharedRuleRevisions,
    schema,
    activities,
    sources,
    targets,
  };
  return {
    frozen,
    records,
    mappingHash: hash({ mappings, mappingRevisions, sharedRules, sharedRuleRevisions, activities }),
    inputHash: hash({ sourceInstance: SOURCE_INSTANCE, snapshot, sources, policy: POLICY, schema }),
    targetHash: hash(targets),
  };
}
