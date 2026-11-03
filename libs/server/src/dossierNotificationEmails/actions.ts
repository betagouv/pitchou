import type { Knex } from "knex";
import { dossierAccessSql } from "../dossierRouting/access.ts";
import { recordNotificationHistory } from "./history.ts";
import { actionNotBaselineSql, actionVisibleSql, deliveryTimeSql } from "./policy.ts";

const deferred = new WeakMap<Knex, string[]>();

// Synchronization marks initial imports as baseline after writing their relations.
// Collect only this operation's action ids and inspect their final state before commit.
export async function withDeferredActionNotifications<T>(
  trx: Knex.Transaction,
  run: () => Promise<T>,
): Promise<T> {
  if (deferred.has(trx)) return run();
  const ids: string[] = [];
  deferred.set(trx, ids);
  try {
    const result = await run();
    deferred.delete(trx);
    await queueActionNotifications(trx, ids);
    return result;
  } finally {
    deferred.delete(trx);
  }
}

export async function queueActionNotifications(trx: Knex.Transaction, ids: string[]) {
  if (ids.length === 0) return;
  const pending = deferred.get(trx);
  if (pending) {
    pending.push(...ids);
    return;
  }
  const previous = await trx("email_notification_outbox")
    .where("status", "cancelled")
    .whereIn(
      "dossier",
      trx("action_dossier").whereRaw("id = ANY(?::uuid[])", [ids]).select("dossier"),
    )
    .select("*");
  const { rows } = await trx.raw(
    `
    WITH actions AS (SELECT * FROM action_dossier WHERE id = ANY(?::uuid[])),
    candidates AS (
      SELECT f.personne, a.dossier,
        CASE WHEN a.type = 'dossier_suivi' THEN 'assignment' ELSE 'novelty' END AS kind,
        CASE WHEN a.type = 'dossier_suivi' THEN a.id::text
          ELSE (${deliveryTimeSql("a.created_at")} AT TIME ZONE 'Europe/Paris')::date::text END AS batch_key,
        CASE WHEN a.type = 'dossier_suivi' THEN date_trunc('milliseconds', clock_timestamp())
          ELSE ${deliveryTimeSql("a.created_at")} END AS due_at
      FROM actions a JOIN edge_personne_follows_dossier f ON f.dossier = a.dossier
      JOIN auth_user u ON u.id = f.personne
      JOIN email_notification_preferences p ON p.personne = u.id
      CROSS JOIN LATERAL (SELECT ${dossierAccessSql("a.dossier", "u.id")} AS level) access
      WHERE access.level IS NOT NULL AND ${actionNotBaselineSql()}
        AND (a.author_personne IS NULL OR a.author_personne <> u.id)
        AND ((a.type = 'dossier_suivi' AND a.author_personne IS NOT NULL
            AND u.email = a.data->>'follower' AND p.assignment)
          OR (a.type <> 'dossier_suivi' AND p.novelty AND ${actionVisibleSql("a", "access.level = 'lecture'")}))
    ) INSERT INTO email_notification_outbox (personne, dossier, kind, batch_key, due_at)
      SELECT personne, dossier, kind, batch_key, min(due_at) FROM candidates
      GROUP BY personne, dossier, kind, batch_key
      ON CONFLICT (personne, dossier, kind, batch_key) DO UPDATE
        SET status = 'pending', cancellation_reason = NULL
        WHERE email_notification_outbox.kind = 'novelty'
          AND email_notification_outbox.status = 'cancelled'
          AND email_notification_outbox.first_attempt_at IS NULL RETURNING *`,
    [ids],
  );
  await recordNotificationHistory(trx, rows, new Map(previous.map((row) => [row.id, row])));
}
