import { reconciliationHash, reconciliationEvidence } from "./linked.mjs";

/** Keep secondary DN entries intact while recognizing their reviewed main record. */
export async function reviewedRelatedCandidates(client, decisions) {
  const mainIds = new Set(decisions.map((d) => d.dossierId));
  const related = new Map();
  for (const decision of decisions) {
    if (decision.relatedExisting !== undefined && !Array.isArray(decision.relatedExisting))
      throw new Error("Related existing records must be an explicit array");
    for (const entry of decision.relatedExisting ?? []) {
      if (
        !Number.isSafeInteger(entry.dossierId) ||
        entry.dossierId <= 0 ||
        mainIds.has(entry.dossierId) ||
        !["duplicate", "supplement"].includes(entry.relationship) ||
        typeof entry.reason !== "string" ||
        entry.reason.trim().length < 80 ||
        !entry.targetHash ||
        !entry.targetEvidenceHash
      )
        throw new Error("Related DN entries require a documented main record and exact evidence");
      const previous = related.get(entry.dossierId);
      if (previous && reconciliationHash(previous) !== reconciliationHash(entry))
        throw new Error("Conflicting reviews of a related DN entry");
      related.set(entry.dossierId, entry);
    }
  }
  if (related.size === 0) return new Set();
  await client.query(
    "LOCK TABLE dossier, decision_administrative, avis_expert, commentaire IN SHARE MODE",
  );
  for (const entry of related.values()) {
    const current = (
      await client.query("SELECT to_jsonb(d) AS row FROM dossier d WHERE id=$1", [entry.dossierId])
    ).rows[0]?.row;
    if (
      !current ||
      current.source !== "demarche_numerique" ||
      reconciliationHash(current) !== entry.targetHash ||
      reconciliationHash(await reconciliationEvidence(client, entry.dossierId)) !==
        entry.targetEvidenceHash
    )
      throw new Error(`Related DN record changed; review again: ${entry.dossierId}`);
    const owned = await client.query(
      `SELECT 1 FROM onagre_local_import.reconciled_demande WHERE dossier_id=$1
      UNION ALL SELECT 1 FROM onagre_local_import.identity WHERE table_name='dossier' AND target_id=$2`,
      [entry.dossierId, String(entry.dossierId)],
    );
    if (owned.rows.length > 0)
      throw new Error("An already linked or imported record cannot become a secondary DN entry");
  }
  return new Set(related.keys());
}
