import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { addDossierSearch } from "./dossier_search.ts";

import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

export async function addEvenementFromCap(cap: string, event: EvenementMetrique) {
  const personne = await directDatabaseConnection("cap_evenement_metrique")
    .select("id")
    .from("personne")
    .join("cap_evenement_metrique", {
      "cap_evenement_metrique.personne_cap": "personne.access_code",
    })
    .where({ "cap_evenement_metrique.cap": cap })
    .first();

  if (!personne) {
    throw new Error("Pas de personne avec cette capability");
  }

  await directDatabaseConnection("evenement_metrique").insert({
    evenement: event.type,
    details: "détails" in event ? event.détails : null,
    personne: personne.id,
  });

  // Text searches also feed the recent-searches suggestions of the search bar
  if (event.type === "rechercherDesDossiers") {
    const text = event.détails.filters.text?.trim();
    if (text) {
      await addDossierSearch(personne.id, text);
    }
  }
}

export async function deleteEvenementsByEmail(
  email: NonNullable<Personne["email"]>,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("evenement_metrique")
    .join("personne", { "personne.id": "evenement_metrique.personne" })
    .where({ email: email })
    .delete();
}

export async function getAllEvenementsWithEmail(): Promise<
  {
    email: string | null;
    groupesInstructeurs: string[] | null;
    date: Date;
    evenement: string;
    details: unknown | null;
  }[]
> {
  const groupesByPersonne = directDatabaseConnection("cap_dossier")
    .join(
      "edge_cap_dossier__groupe_instructeurs",
      "edge_cap_dossier__groupe_instructeurs.cap_dossier",
      "cap_dossier.cap",
    )
    .join(
      "groupe_instructeurs",
      "groupe_instructeurs.id",
      "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    )
    .select("cap_dossier.personne_cap")
    .select(
      directDatabaseConnection.raw(
        "array_agg(DISTINCT groupe_instructeurs.name ORDER BY groupe_instructeurs.name) as groupes",
      ),
    )
    .groupBy("cap_dossier.personne_cap")
    .as("groupes_par_personne");

  return directDatabaseConnection("evenement_metrique")
    .join("personne", { "personne.id": "evenement_metrique.personne" })
    .leftJoin(groupesByPersonne, "groupes_par_personne.personne_cap", "personne.access_code")
    .select(
      "personne.email",
      "groupes_par_personne.groupes as groupesInstructeurs",
      "evenement_metrique.date",
      "evenement_metrique.evenement",
      "evenement_metrique.details",
    )
    .whereNot("personne.email", "like", "%beta.gouv%")
    .orderBy("evenement_metrique.date", "asc");
}

export async function deleteEvenementsBeforeDate(
  date: Date,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("evenement_metrique").where("date", "<", date).delete();
}
