import type { Knex } from "knex";
import { updateNotifications } from "./history.ts";
import { cancellationReasonSql } from "./policy.ts";

export async function cancelIneligibleNotifications(
  trx: Knex.Transaction,
  scope: { dossiers?: number[]; users?: number[] } = {},
) {
  await updateNotifications(
    trx,
    (db) => {
      const query = db("email_notification_outbox as n")
        .where("n.status", "pending")
        .whereRaw(`${cancellationReasonSql()} IS NOT NULL`);
      if (scope.dossiers) query.whereIn("n.dossier", scope.dossiers);
      if (scope.users) query.whereIn("n.personne", scope.users);
      return query;
    },
    {
      status: "cancelled",
      claimed_at: null,
      cancellation_reason: trx.raw(cancellationReasonSql("email_notification_outbox")),
    },
  );
}
