import type { Knex } from "knex";
import { randomUUID } from "node:crypto";
import { insertBatches } from "../database/insertBatches.ts";

export type NotificationRow = {
  id: string;
  personne: number;
  dossier: number;
  kind: string;
  status: string;
  due_at: Date;
  environment: string;
  attempt_count: number;
  claimed_at: Date | null;
  last_error: string | null;
  provider_message_id: string | null;
  cancellation_reason: string | null;
};

export async function recordNotificationHistory(
  trx: Knex.Transaction,
  rows: NotificationRow[],
  previous: Map<string, NotificationRow> = new Map(),
) {
  const history = [];
  const metrics = [];
  for (const row of rows) {
    const old = previous.get(row.id);
    const event =
      !old || (old.status === "cancelled" && row.status === "pending")
        ? "queued"
        : old.status !== row.status && ["sent", "cancelled", "uncertain"].includes(row.status)
          ? row.status
          : row.attempt_count > old.attempt_count
            ? "attempted"
            : old.claimed_at && !row.claimed_at && row.status === "pending" && row.last_error
              ? "failed"
              : null;
    if (!event) continue;
    const id = randomUUID();
    const occurredAt = new Date();
    const details = {
      notificationId: row.id,
      type: row.kind,
      recipientId: row.personne,
      dossierId: row.dossier,
      scheduledAt: row.due_at,
      occurredAt,
      attempt: row.attempt_count,
      environment: row.environment,
      source: "system",
      attribution: "recipient",
      ...(event === "sent" ? { providerMessageId: row.provider_message_id } : {}),
      ...(["failed", "uncertain"].includes(event) ? { errorCategory: row.last_error } : {}),
      ...(event === "cancelled" ? { reason: row.cancellation_reason } : {}),
    };
    history.push({
      id,
      notification_id: row.id,
      personne: row.personne,
      dossier: row.dossier,
      kind: row.kind,
      event,
      occurred_at: occurredAt,
      environment: row.environment,
      attempt: row.attempt_count,
      details: JSON.stringify(details),
    });
    if (event !== "attempted")
      metrics.push({
        id,
        personne: row.personne,
        date: occurredAt,
        evenement: `notificationEmail${event[0].toUpperCase()}${event.slice(1)}`,
        details: JSON.stringify(details),
      });
  }
  for (const batch of insertBatches(history)) await trx("email_notification_history").insert(batch);
  if (metrics.length === 0) return;
  const users = new Set(
    await trx("auth_user")
      .whereIn("id", [...new Set(metrics.map((m) => m.personne))])
      .pluck("id"),
  );
  for (const batch of insertBatches(metrics.filter((metric) => users.has(metric.personne))))
    await trx("evenement_metrique").insert(batch);
}

export async function updateNotifications(
  db: Knex | Knex.Transaction,
  select: (trx: Knex.Transaction) => Knex.QueryBuilder,
  changes: Record<string, unknown>,
): Promise<void> {
  if (!db.isTransaction) return db.transaction((trx) => updateNotifications(trx, select, changes));
  const trx = db as Knex.Transaction;
  const before: NotificationRow[] = await select(trx).select("*").forUpdate();
  if (before.length === 0) return;
  const rows = await trx("email_notification_outbox")
    .whereRaw("id = ANY(?::uuid[])", [before.map((row) => row.id)])
    .update(changes)
    .returning("*");
  await recordNotificationHistory(trx, rows, new Map(before.map((row) => [row.id, row])));
}
