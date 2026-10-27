import { mergeFields } from "./merge.mjs";
const quote = (value) => `"${value}"`;
async function insert(client, table, fields) {
  const keys = Object.keys(fields);
  const result = await client.query(
    `INSERT INTO public.${quote(table)} (${keys.map(quote).join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id`,
    Object.values(fields),
  );
  return String(result.rows[0].id);
}
export async function writeRecord(client, dossierKey, sourceKey, table, values, parent) {
  const identity = (
    await client.query(
      "SELECT * FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$2 FOR UPDATE",
      [dossierKey, sourceKey],
    )
  ).rows[0];
  if (identity && identity.table_name !== table)
    throw new Error(`Source identity changed table: ${sourceKey}`);
  let targetId = identity?.target_id,
    status = "unchanged",
    preserved = [];
  if (identity) {
    const current = (
      await client.query(`SELECT * FROM public.${quote(table)} WHERE id=$1 FOR UPDATE`, [targetId])
    ).rows[0];
    if (!current)
      throw new Error(
        `Imported record was deleted: ${sourceKey}. Restore or explicitly resolve it before reimporting.`,
      );
    if (
      (table === "dossier" && current.source !== "onagre") ||
      Object.entries(parent).some(([key, value]) => String(current[key]) !== String(value))
    )
      throw new Error(`Ownership changed: ${sourceKey}`);
    const result = mergeFields(identity.last_fields, current, values);
    if (result.conflicts.length > 0)
      throw new Error(
        `Conflict for ${sourceKey}: ${result.conflicts.join(", ")}. Transaction rolled back.`,
      );
    preserved = result.preserved;
    const entries = Object.entries(result.updates);
    if (entries.length > 0) {
      await client.query(
        `UPDATE public.${quote(table)} SET ${entries.map(([key], i) => `${quote(key)}=$${i + 1}`).join(",")} WHERE id=$${entries.length + 1}`,
        [...entries.map(([, value]) => value), targetId],
      );
      status = "updated";
    }
    await client.query(
      "UPDATE onagre_local_import.identity SET last_fields=$3 WHERE dossier_key=$1 AND source_key=$2",
      [dossierKey, sourceKey, JSON.stringify(values)],
    );
  } else {
    targetId = await insert(client, table, { ...values, ...parent });
    await client.query("INSERT INTO onagre_local_import.identity VALUES ($1,$2,$3,$4,$5)", [
      dossierKey,
      sourceKey,
      table,
      targetId,
      JSON.stringify(values),
    ]);
    status = "created";
  }
  return { sourceKey, table, targetId, status, preserved };
}
