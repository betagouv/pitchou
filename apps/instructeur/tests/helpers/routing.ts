import { reconcileArrivalNotifications } from "@pitchou/server/dossierNotificationEmails/arrivals.ts";
import { recordNotificationHistory } from "@pitchou/server/dossierNotificationEmails/history.ts";
import { lockDossierAccess } from "@pitchou/server/dossierRouting.ts";
import type { Knex } from "knex";

// Notification tests may install edges directly to isolate arrival reconciliation
// from rule matching. Production writers use recalculateAssignments instead.
export async function changeArrivalEdges<T>(
  db: Knex,
  change: (trx: Knex.Transaction) => PromiseLike<T>,
  silent = false,
): Promise<T> {
  if (!db.isTransaction) return db.transaction((trx) => changeArrivalEdges(trx, change, silent));
  const trx = db as Knex.Transaction;
  await lockDossierAccess(trx);
  const result = await change(trx);
  await reconcileArrivalNotifications(trx, await trx("dossier").pluck("id"), silent);
  return result;
}

// Monitoring fixtures deliberately bypass eligibility. Record the same persisted
// state transitions as the dispatcher, without restoring automatic SQL triggers.
export async function writeNotificationFixture(
  db: Knex,
  write: (trx: Knex.Transaction) => Knex.QueryBuilder,
): Promise<any[]> {
  if (!db.isTransaction) return db.transaction((trx) => writeNotificationFixture(trx, write));
  const trx = db as Knex.Transaction;
  const before = await trx("email_notification_outbox");
  const rows = await write(trx).returning("*");
  await recordNotificationHistory(trx, rows, new Map(before.map((row) => [row.id, row])));
  return rows;
}
