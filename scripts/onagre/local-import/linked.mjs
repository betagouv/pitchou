import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
export const reconciliationHash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
export const existingIdentity = (row) =>
  Object.fromEntries(
    [
      "source",
      "onagre_demande_identifier",
      "demarche_numerique_id",
      "demarche_numerique_number",
    ].map((key) => [key, row[key] ?? null]),
  );

export async function reconciliationEvidence(client, dossierId) {
  const evidence = {};
  for (const table of ["decision_administrative", "avis_expert", "commentaire"])
    evidence[table] = (
      await client.query(
        `SELECT to_jsonb(t) AS row FROM ${table} t WHERE dossier=$1 ORDER BY to_jsonb(t)::text`,
        [dossierId],
      )
    ).rows.map((r) => r.row);
  return evidence;
}

export async function readReconciledLinks(client, project) {
  const exists = (
    await client.query(
      "SELECT to_regclass('onagre_local_import.reconciled_demande') IS NOT NULL AS present",
    )
  ).rows[0].present;
  if (!exists) return [];
  const rows = (
    await client.query(
      `SELECT r.*, to_jsonb(d) AS current, m.projet AS current_project
    FROM onagre_local_import.reconciled_demande r
    LEFT JOIN public.dossier d ON d.id=r.dossier_id
    LEFT JOIN public.dossier_demande m ON m.dossier=r.dossier_id
    WHERE r.project_key=$1 ORDER BY r.source_key`,
      [project.identity.key],
    )
  ).rows;
  for (const row of rows) {
    if (row.source_hash !== reconciliationHash(project))
      throw new Error(`Reconciled source changed; review again: ${project.identity.key}`);
    if (
      !row.current ||
      row.current_project !== row.project_id ||
      !isDeepStrictEqual(existingIdentity(row.current), row.original_identity)
    )
      throw new Error(
        `Reconciled target identity or membership changed; review again: ${row.source_key}`,
      );
  }
  return rows;
}
