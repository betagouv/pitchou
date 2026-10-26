import { randomUUID } from "node:crypto";
import type { SourceRow } from "@pitchou/types/onagre.ts";
import { recordFingerprint } from "@pitchou/server/onagre/snapshots.ts";

export type Database = typeof import("@pitchou/server/database.ts").directDatabaseConnection;

export async function snapshot(
  db: Database,
  rows: { id: number; demande?: SourceRow; projet?: SourceRow }[],
) {
  const [result] = await db("onagre_snapshot")
    .insert({
      fingerprint: randomUUID(),
      filename: "synthetic-import-test",
      workbook_fingerprint: "synthetic",
      tables: "[]",
      workbook_mappings: "[]",
      records_complete: true,
    })
    .returning("id");
  for (const row of rows) {
    const demande = {
      demandesid: String(row.id),
      projetid: String(row.id),
      codedemande: `TEST-${row.id}`,
      datereception: "1998-02-03",
      ...row.demande,
    };
    const projet = {
      projetid: String(row.id),
      nomprojet: `Projet ${row.id}`,
      description: "Donnée brute non importée",
      ...row.projet,
    };
    await db("onagre_source_demande").insert({
      snapshot_id: result.id,
      source_id: row.id,
      projet_id: Number(demande.projetid),
      code: demande.codedemande,
      name: projet.nomprojet,
      demande,
      projet,
      fingerprint: recordFingerprint(demande, projet),
    });
  }
  return result.id as number;
}

export async function counts(db: Database) {
  const result: Record<string, number> = {};
  for (const table of [
    "dossier",
    "onagre_import_identity",
    "onagre_import_run",
    "evenement_phase_dossier",
    "edge_groupe_instructeurs__dossier",
    "edge_personne_follows_dossier",
    "action_dossier",
    "notification",
    "email_notification_outbox",
    "email_notification_groupe_arrival",
  ])
    result[table] = Number((await db(table).count("* as count"))[0].count);
  return result;
}

export function enable() {
  process.env.ONAGRE_DEPLOYMENT_ROLE = "rehearsal";
  process.env.ONAGRE_IMPORT_ENABLED = "true";
  process.env.ONAGRE_SOURCE_INSTANCE = "onagre-national";
}
