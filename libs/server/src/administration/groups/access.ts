import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { getSessionUser } from "../../users.ts";

export async function requireGroupManager(db: Knex.Transaction, actor: UserId) {
  const user = await getSessionUser(actor, db);
  if (!user?.permissions.includes("admin:access") || !user.permissions.includes("groups:manage"))
    throw new TypeError("Gestion des groupes non autorisée");
}
