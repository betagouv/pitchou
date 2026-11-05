import type { Knex } from "knex";
import type { FrozenInput, Source } from "./state.ts";
import { hash, OnagreImportError, POLICY, SOURCE_INSTANCE } from "./policy.ts";
import { inspectRecord, type Target } from "./records.ts";
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

async function captureTargets(
  connection: Knex,
  snapshotId: number,
  ids: string[],
  sources: (Source | null)[],
): Promise<Target[]> {
  if (ids.length === 0) return [];
  const codes = [
    ...new Set(
      sources
        .map((source) => source?.demande.codedemande?.trim())
        .filter((code): code is string => !!code),
    ),
  ];
  const identities = await connection("onagre_import_identity")
    .where({ source_instance: SOURCE_INSTANCE })
    .whereIn("source_id", ids.map(Number));
  // Query all matching codes once per batch, retaining exact PostgreSQL timestamps.
  const dossiers = await connection("dossier")
    .where((builder) => {
      builder.whereIn(
        "id",
        identities.map((identity) => identity.dossier_id),
      );
      if (codes.length > 0)
        builder.orWhereRaw("btrim(onagre_demande_identifier) = any(?::text[])", [codes]);
    })
    .select(
      connection.raw("to_jsonb(dossier) as content, btrim(onagre_demande_identifier) as code"),
    )
    .orderBy("id");
  const duplicates =
    codes.length > 0
      ? await connection("onagre_source_demande")
          .where({ snapshot_id: snapshotId })
          .whereRaw("btrim(demande->>'codedemande') = any(?::text[])", [codes])
          .select(connection.raw("btrim(demande->>'codedemande') as code"))
          .count("* as count")
          .groupByRaw("btrim(demande->>'codedemande')")
      : [];
  return ids.map((id, index) => {
    const code = sources[index]?.demande.codedemande?.trim();
    const identity = identities.find((row) => row.source_id === Number(id)) ?? null;
    return {
      identity,
      dossier: dossiers.find((row) => row.content.id === identity?.dossier_id)?.content ?? null,
      candidates: code ? dossiers.filter((row) => row.code === code).map((row) => row.content) : [],
      duplicateSources: Number(duplicates.find((row) => row.code === code)?.count ?? 0),
    };
  });
}
