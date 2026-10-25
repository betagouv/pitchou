import { createHash } from "node:crypto";
import type { Knex } from "knex";
import type { OnagreBundle, SourceRow } from "@pitchou/types/onagre.ts";
import { enrichSnapshotConstraints } from "./constraints.ts";

export function recordFingerprint(demande: SourceRow, projet: SourceRow): string {
  const canonical = (row: SourceRow) =>
    Object.keys(row)
      .sort()
      .map((key) => [key, row[key]]);
  return createHash("sha256")
    .update(JSON.stringify([canonical(demande), canonical(projet)]))
    .digest("hex");
}

export async function stageSnapshot(trx: Knex.Transaction, bundle: OnagreBundle) {
  // Serialize concurrent uploads. A failed transaction leaves no half-loaded snapshot.
  await trx.raw("select pg_advisory_xact_lock(24102026)");
  const original = await trx("onagre_snapshot").orderBy("id").first("workbook_fingerprint");
  if (original && original.workbook_fingerprint !== bundle.workbookFingerprint) {
    throw new Error(
      "Le classeur d'origine a changé. Préparez le nouveau dump avec le même classeur. Les correspondances se modifient maintenant dans l'administration.",
    );
  }
  const existing = await trx("onagre_snapshot")
    .where({ fingerprint: bundle.fingerprint })
    .first("id");
  if (existing) {
    await enrichSnapshotConstraints(trx, existing.id, bundle.tables);
    return { id: existing.id as number, duplicate: true };
  }
  const [snapshot] = await trx("onagre_snapshot")
    .insert({
      fingerprint: bundle.fingerprint,
      filename: bundle.filename,
      workbook_fingerprint: bundle.workbookFingerprint,
      tables: JSON.stringify(bundle.tables),
      workbook_mappings: JSON.stringify(bundle.mappings),
    })
    .returning("id");
  for (let i = 0; i < bundle.mappings.length; i += 100) {
    await trx("onagre_mapping")
      .insert(bundle.mappings.slice(i, i + 100))
      .onConflict("key")
      .ignore();
  }
  const projets = new Map(bundle.projets.map((row) => [row.projetid, row]));
  for (let i = 0; i < bundle.demandes.length; i += 200) {
    await trx("onagre_source_demande").insert(
      bundle.demandes.slice(i, i + 200).map((demande) => {
        const projet = projets.get(demande.projetid)!;
        return {
          snapshot_id: snapshot.id,
          source_id: Number(demande.demandesid),
          projet_id: Number(demande.projetid),
          code: demande.codedemande ?? "",
          name: projet.nomprojet ?? "",
          fingerprint: recordFingerprint(demande, projet),
          demande,
          projet,
        };
      }),
    );
  }
  return { id: snapshot.id as number, duplicate: false };
}
