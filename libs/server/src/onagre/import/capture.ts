import type { Knex } from "knex";
import type { FrozenInput, Source } from "./state.ts";
import { hash, OnagreImportError, POLICY, SOURCE_INSTANCE } from "./policy.ts";
import { inspectRecord, type Target } from "./records.ts";

export async function capture(connection: Knex, snapshotId: number, ids: string[]) {
  await connection.raw("SET LOCAL TIME ZONE 'UTC'");
  const snapshot = await connection("onagre_snapshot").where({ id: snapshotId }).first();
  if (!snapshot) throw new OnagreImportError("Snapshot introuvable.", 404);
  // Keep reads sequential: this also runs on a single transaction connection.
  const mappings = await connection("onagre_mapping").select("*").orderBy("key");
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
  const targets: Target[] = [];
  for (let i = 0; i < ids.length; i++)
    targets.push(await captureTarget(connection, snapshotId, ids[i], sources[i]));
  const records = ids.map((id, i) => inspectRecord(id, sources[i], targets[i], schema));
  const frozen: Omit<FrozenInput, "preview"> = {
    snapshot,
    mappings,
    mappingRevisions,
    sharedRules,
    sharedRuleRevisions,
    schema,
    sources,
    targets,
  };
  return {
    frozen,
    records,
    mappingHash: hash({ mappings, mappingRevisions, sharedRules, sharedRuleRevisions }),
    inputHash: hash({ sourceInstance: SOURCE_INSTANCE, snapshot, sources, policy: POLICY, schema }),
    targetHash: hash(targets),
  };
}

async function captureTarget(
  connection: Knex,
  snapshotId: number,
  recordId: string,
  source: Source | null,
): Promise<Target> {
  const code = source?.demande.codedemande?.trim();
  const identity =
    (await connection("onagre_import_identity")
      .where({ source_instance: SOURCE_INSTANCE, source_id: Number(recordId) })
      .first()) ?? null;
  // JSON from PostgreSQL preserves timestamp microseconds that the JS Date
  // parser would otherwise discard when checking target changes.
  const dossier = identity
    ? ((
        await connection("dossier")
          .where({ id: identity.dossier_id })
          .select(connection.raw("to_jsonb(dossier) as content"))
          .first()
      )?.content ?? null)
    : null;
  const candidates = code
    ? await connection("dossier")
        .whereRaw("btrim(onagre_demande_identifier) = ?", [code])
        .select(connection.raw("to_jsonb(dossier) as content"))
        .orderBy("id")
    : [];
  const duplicateSources = code
    ? Number(
        (
          await connection("onagre_source_demande")
            .where({ snapshot_id: snapshotId })
            .whereRaw("btrim(demande->>'codedemande') = ?", [code])
            .count("* as count")
        )[0].count,
      )
    : 0;
  return {
    identity,
    dossier,
    candidates: candidates.map((row) => row.content),
    duplicateSources,
  };
}
