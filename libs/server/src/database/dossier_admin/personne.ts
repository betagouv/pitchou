import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import { directDatabaseConnection } from "../../database.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

export async function ensurePersonneIdByEmail(
  email: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<PersonneId> {
  const normalized = normalizeEmail(email);
  await databaseConnection("personne")
    .insert({ email: normalized, last_name: "", first_names: "" })
    .onConflict("email")
    .ignore();
  const row = await databaseConnection("personne")
    .select("id")
    .where({ email: normalized })
    .first();
  return row.id;
}
