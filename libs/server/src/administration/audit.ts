import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
export async function audit(trx: Knex.Transaction, actor: UserId, action: string, data: unknown) {
  await trx("administration_event").insert({ actor, action, data: JSON.stringify(data) });
}
