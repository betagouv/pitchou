import { error } from "@sveltejs/kit";
import type { Knex } from "knex";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { getSessionUser } from "@pitchou/server/users.ts";
import type { Permission, SessionUser } from "@pitchou/types/permissions.ts";

export async function withAdminWriteAccess<T>(
  locals: App.Locals,
  permission: Permission | readonly Permission[],
  write: (transaction: Knex.Transaction, actor: SessionUser) => Promise<T>,
): Promise<T> {
  const userId = locals.user?.id;
  if (!userId) error(401, "Authentification requise");
  // Call after parsing the body, before any mutation or row lock. Permission
  // changes use this same lock, so they cannot commit during the write.
  return directDatabaseConnection.transaction(async (transaction) => {
    await transaction.raw("select pg_advisory_xact_lock(2105102026)");
    const actor = await getSessionUser(userId, transaction);
    const required = typeof permission === "string" ? [permission] : permission;
    if (
      !actor?.permissions.includes("admin:access") ||
      !required.some((value) => actor.permissions.includes(value))
    ) {
      error(403, "Permission insuffisante");
    }
    return write(transaction, actor);
  });
}
