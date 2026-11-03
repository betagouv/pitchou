import type { Knex } from "knex";
import { dossierAccessSql } from "../dossierRouting/access.ts";
import { cancelIneligibleNotifications } from "./cancellation.ts";
import { recordNotificationHistory } from "./history.ts";

export async function reconcileArrivalNotifications(
  trx: Knex.Transaction,
  dossiers: number[],
  silent = false,
) {
  if (dossiers.length === 0) return;
  await trx.raw(
    `DELETE FROM email_notification_groupe_arrival a
    WHERE a.dossier = ANY(?::integer[]) AND NOT EXISTS (
      SELECT 1 FROM edge_groupe_instructeurs__dossier e
      WHERE e.dossier = a.dossier AND e.groupe_instructeurs = a.groupe_instructeurs)`,
    [dossiers],
  );
  await cancelIneligibleNotifications(trx, { dossiers });
  const { rows } = await trx.raw(
    `WITH revisions AS MATERIALIZED (
      SELECT id, gen_random_uuid() AS revision FROM dossier WHERE id = ANY(?::integer[])
    ), arrivals AS (
      INSERT INTO email_notification_groupe_arrival (dossier, groupe_instructeurs, revision)
      SELECT e.dossier, e.groupe_instructeurs, r.revision
      FROM edge_groupe_instructeurs__dossier e JOIN revisions r ON r.id = e.dossier
      ON CONFLICT (dossier, groupe_instructeurs) DO NOTHING RETURNING *
    ) INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
      SELECT DISTINCT u.id, a.dossier, 'arrival', a.revision::text,
        date_trunc('milliseconds', clock_timestamp())
      FROM arrivals a JOIN user_groupe m ON m.groupe_instructeurs = a.groupe_instructeurs
      JOIN groupe_instructeurs g ON g.id = m.groupe_instructeurs AND g.active
      JOIN auth_user u ON u.id = m.user_id
      JOIN email_notification_preferences p ON p.personne = u.id
      WHERE NOT ?::boolean AND p.arrival AND u.email IS NOT NULL
        AND ${dossierAccessSql("a.dossier", "u.id")} IS NOT NULL
      ON CONFLICT DO NOTHING RETURNING *`,
    [dossiers, silent],
  );
  await recordNotificationHistory(trx, rows);
}
