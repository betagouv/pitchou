import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import { directDatabaseConnection } from "../../database.ts";
import type { UserId } from "@pitchou/types/permissions.ts";

export async function ensurePersonneIdByEmail(
  email: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<UserId> {
  const normalized = normalizeEmail(email);
  await databaseConnection("auth_user")
    .insert({ email: normalized, last_name: "", first_names: "" })
    .onConflict()
    .ignore();
  const row = await databaseConnection("auth_user")
    .select("id")
    .where({ email: normalized })
    .first();
  return row.id;
}
