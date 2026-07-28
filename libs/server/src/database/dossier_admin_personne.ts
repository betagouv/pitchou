import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

/** Returns the personne id for an email, creating the row if needed. */
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
