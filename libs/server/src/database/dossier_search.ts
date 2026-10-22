import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { AuthUser as Personne } from "@pitchou/types/permissions.ts";

export async function addDossierSearch(
  personneId: Personne["id"],
  text: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  await databaseConnection("dossier_search").insert({
    personne: personneId,
    text: text.trim(),
  });
}

/** Returns the user's three most recent distinct searches. */
export async function getRecentSearchesForUser(
  userId: number,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string[]> {
  const rows = await databaseConnection("dossier_search")
    .join("auth_user as personne", "personne.id", "dossier_search.personne")
    .where("personne.id", userId)
    .groupBy("dossier_search.text")
    .select("dossier_search.text")
    .max("dossier_search.date as last_date")
    .orderBy("last_date", "desc")
    .limit(3);

  return rows.map((row) => row.text);
}
