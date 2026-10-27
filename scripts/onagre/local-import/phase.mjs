import { mergeFields } from "./merge.mjs";
export async function writePhase(client, dossierKey, record, dossierId) {
  const { sourceKey, values } = record;
  const identity = (
    await client.query(
      "SELECT * FROM onagre_local_import.identity WHERE dossier_key=$1 AND source_key=$2 FOR UPDATE",
      [dossierKey, sourceKey],
    )
  ).rows[0];
  const table = "evenement_phase_dossier";
  let status = "unchanged";
  if (identity) {
    if (identity.table_name !== table) throw new Error("Phase identity changed table");
    const [oldDossier, oldPhase, oldTimestamp] = JSON.parse(identity.target_id);
    if (Number(oldDossier) !== Number(dossierId)) throw new Error("Phase ownership changed");
    const live = (
      await client.query(
        "SELECT phase,timestamp FROM evenement_phase_dossier WHERE dossier=$1 AND phase=$2 AND timestamp=$3 FOR UPDATE",
        [dossierId, oldPhase, oldTimestamp],
      )
    ).rows[0];
    if (!live) throw new Error(`Imported phase was edited or deleted: ${sourceKey}`);
    const current = { ...live, timestamp: live.timestamp.toISOString() };
    const result = mergeFields(identity.last_fields, current, values);
    if (result.conflicts.length > 0 || result.preserved.length > 0)
      throw new Error(`Conflict for phase ${sourceKey}`);
    if (Object.keys(result.updates).length > 0) {
      await client.query(
        "UPDATE evenement_phase_dossier SET phase=$4,timestamp=$5 WHERE dossier=$1 AND phase=$2 AND timestamp=$3",
        [dossierId, oldPhase, oldTimestamp, values.phase, values.timestamp],
      );
      status = "updated";
    }
  } else {
    const exists = (
      await client.query(
        "SELECT 1 FROM evenement_phase_dossier WHERE dossier=$1 AND phase=$2 AND timestamp=$3",
        [dossierId, values.phase, values.timestamp],
      )
    ).rows.length;
    if (exists) throw new Error("Existing unowned phase; automatic adoption is disabled");
    await client.query(
      "INSERT INTO evenement_phase_dossier (dossier,phase,timestamp) VALUES ($1,$2,$3)",
      [dossierId, values.phase, values.timestamp],
    );
    status = "created";
  }
  const targetId = JSON.stringify([Number(dossierId), values.phase, values.timestamp]);
  await client.query(
    `INSERT INTO onagre_local_import.identity VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (dossier_key,source_key) DO UPDATE SET target_id=EXCLUDED.target_id,last_fields=EXCLUDED.last_fields`,
    [dossierKey, sourceKey, table, targetId, JSON.stringify(values)],
  );
  return { sourceKey, table, targetId, status, preserved: [] };
}
