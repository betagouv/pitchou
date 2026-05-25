import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.js";

import type { ÉvènementMétrique } from "../../types/évènement.d.ts";
import type { default as Personne } from "../../types/database/public/Personne.ts";

export async function ajouterÉvènementDepuisCap(cap: string, évènement: ÉvènementMétrique) {
  const personne = await directDatabaseConnection("cap_évènement_métrique")
    .select("id")
    .from("personne")
    .join("cap_évènement_métrique", {
      "cap_évènement_métrique.personne_cap": "personne.code_accès",
    })
    .where({ "cap_évènement_métrique.cap": cap })
    .first();

  if (!personne) {
    throw new Error("Pas de personne avec cette capability");
  }

  await directDatabaseConnection("évènement_métrique").insert({
    évènement: évènement.type,
    détails: "détails" in évènement ? évènement.détails : null,
    personne: personne.id,
  });
}

export async function supprimerÉvènementsParEmail(
  email: NonNullable<Personne["email"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("évènement_métrique")
    .join("personne", { "personne.id": "évènement_métrique.personne" })
    .where({ email: email })
    .delete();
}

export async function supprimerÉvènementsAvantTelleDate(
  date: Date,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("évènement_métrique").where("date", "<", date).delete();
}
