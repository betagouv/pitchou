import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

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

/**
 * The 3 most-recently-used distinct search texts of the personne holding the given
 * `cap_evenement_metrique` cap, most recent first.
 */
export async function getRecentSearchesFromCap(
  cap: string,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string[]> {
  const rows = await databaseConnection("dossier_search")
    .join("personne", "personne.id", "dossier_search.personne")
    .join("cap_evenement_metrique", "cap_evenement_metrique.personne_cap", "personne.access_code")
    .where("cap_evenement_metrique.cap", cap)
    .groupBy("dossier_search.text")
    .select("dossier_search.text")
    .max("dossier_search.date as last_date")
    .orderBy("last_date", "desc")
    .limit(3);

  return rows.map((row) => row.text);
}
