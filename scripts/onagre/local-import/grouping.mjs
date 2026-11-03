import { writeRecord } from "./writer.mjs";
import { mergeFields } from "./merge.mjs";

export async function writeProject(client, project) {
  const result = await writeRecord(
    client,
    project.identity.key,
    project.identity.key,
    "dossier_projet",
    project.proposal,
    {},
  );
  return result;
}

export async function writeMembership(client, demande, dossierId, projectId) {
  const key = demande.identity.key,
    sourceKey = `${key}:membership`;
  const values = { projet: projectId, label: demande.label };
  const owned = (
    await client.query(
      "SELECT * FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$2 FOR UPDATE",
      [key, sourceKey],
    )
  ).rows[0];
  const current = (
    await client.query("SELECT * FROM dossier_demande WHERE dossier=$1 FOR UPDATE", [dossierId])
  ).rows[0];
  let status = "unchanged",
    preserved = [];
  if (owned) {
    if (
      owned.table_name !== "dossier_demande" ||
      owned.target_id !== String(dossierId) ||
      !current ||
      current.projet !== projectId ||
      owned.last_fields.projet !== projectId
    )
      throw new Error(`Imported demande grouping changed: ${key}`);
    const merged = mergeFields(owned.last_fields, current, values);
    if (merged.conflicts.length > 0) throw new Error(`Conflict for demande label: ${key}`);
    preserved = merged.preserved;
    if (Object.hasOwn(merged.updates, "label")) {
      await client.query("UPDATE dossier_demande SET label=$2 WHERE dossier=$1", [
        dossierId,
        values.label,
      ]);
      status = "updated";
    }
    await client.query(
      "UPDATE onagre_local_import.identity SET last_fields=$3 WHERE dossier_key=$1 AND source_key=$2",
      [key, sourceKey, JSON.stringify(values)],
    );
  } else {
    if (current) throw new Error(`Demande already belongs to an unowned grouping: ${key}`);
    await client.query("INSERT INTO dossier_demande (dossier,projet,label) VALUES ($1,$2,$3)", [
      dossierId,
      projectId,
      demande.label,
    ]);
    await client.query(
      "INSERT INTO onagre_local_import.identity VALUES ($1,$2,'dossier_demande',$3,$4)",
      [key, sourceKey, String(dossierId), JSON.stringify(values)],
    );
    status = "created";
  }
  return { sourceKey, table: "dossier_demande", targetId: String(dossierId), status, preserved };
}
