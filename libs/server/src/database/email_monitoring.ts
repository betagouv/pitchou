import type { Knex } from "knex";
import type { EmailFilters, EmailOverview, EmailRow } from "@pitchou/types/adminEmails.ts";
import { directDatabaseConnection } from "../database.ts";
import { emailQuery } from "./email_monitoring/query.ts";
import { emailDetail } from "./email_monitoring/detail.ts";
export { emailFilters } from "./email_monitoring/filters.ts";
export const EMAIL_PAGE_SIZE = 20;

export async function emailOverview(
  filters: EmailFilters,
  db: Knex = directDatabaseConnection,
): Promise<EmailOverview> {
  return db.transaction(async (trx) => {
    await trx.raw("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const base = emailQuery(filters, trx);
    const totals = await base.clone().count({ count: "m.id" }).first();
    const total = Number(totals?.count ?? 0);
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / EMAIL_PAGE_SIZE)));
    const counts = await base
      .clone()
      .select("m.kind", "m.status")
      .count({ count: "m.id" })
      .groupBy("m.kind", "m.status");
    const tracking = await base
      .clone()
      .where({ "m.source": "cnpn", "m.status": "sent" })
      .count({ received: "m.delivered_at", opened: "m.opened_at" })
      .first();
    const rows = (await base
      .clone()
      .select("m.*")
      .orderBy(`m.${filters.sort}`, filters.order, "last")
      .orderBy("m.source")
      .orderBy("m.id")
      .limit(EMAIL_PAGE_SIZE)
      .offset((page - 1) * EMAIL_PAGE_SIZE)) as EmailRow[];
    return {
      rows,
      total,
      page,
      counts: counts.map((row) => ({
        kind: row.kind,
        status: row.status,
        count: Number(row.count),
      })),
      cnpn: { received: Number(tracking?.received ?? 0), opened: Number(tracking?.opened ?? 0) },
      detail: filters.email ? await emailDetail(filters.email, trx) : null,
    };
  });
}
