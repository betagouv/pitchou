import type { Knex } from "knex";
import { directDatabaseConnection } from "../database.ts";
import {
  type NotificationFilters,
  type NotificationOverview,
  type NotificationRow,
  type NotificationHistoryRow,
} from "@pitchou/types/emailNotifications.ts";

import { notificationQuery } from "./notification_monitoring/filters.ts";
export { notificationFilters } from "./notification_monitoring/filters.ts";

export const NOTIFICATION_PAGE_SIZE = 20;

export async function notificationOverview(
  filters: NotificationFilters,
  db: Knex = directDatabaseConnection,
): Promise<NotificationOverview> {
  return db.transaction(async (trx) => {
    await trx.raw("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const base = notificationQuery(filters, trx);
    const totals = await base.clone().count({ count: "n.id" }).first();
    const counts = (await base
      .clone()
      .select("n.kind", "n.status")
      .count({ count: "n.id" })
      .groupBy("n.kind", "n.status")) as unknown as {
      kind: string;
      status: string;
      count: string | number;
    }[];
    const rows = (await base
      .clone()
      .select(
        "n.id",
        "n.kind",
        "n.status",
        "n.environment",
        "n.dossier",
        "d.name as dossier_name",
        "n.personne",
        "p.first_names",
        "p.last_name",
        "p.email",
        "n.due_at",
        "n.sent_at",
        "n.created_at",
        "n.retry_at",
        "n.attempt_count",
        "n.last_error",
        "n.cancellation_reason",
        "n.provider_message_id",
      )
      .orderBy("n.due_at", "desc")
      .orderBy("n.id")
      .limit(NOTIFICATION_PAGE_SIZE)
      .offset((filters.page - 1) * NOTIFICATION_PAGE_SIZE)) as NotificationRow[];
    const history = filters.notification
      ? ((await trx("email_notification_history")
          .where({ notification_id: filters.notification })
          .orderBy("occurred_at")
          .orderBy("id")) as NotificationHistoryRow[])
      : [];
    return {
      rows,
      total: Number(totals?.count ?? 0),
      counts: counts.map((r) => ({ kind: r.kind, status: r.status, count: Number(r.count) })),
      history,
    };
  });
}
