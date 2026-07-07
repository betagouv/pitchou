import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { ÉvènementMétrique } from "@pitchou/types/évènement.d.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

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

export async function getAllÉvènementsAvecEmail(): Promise<
  {
    email: string | null;
    groupesInstructeurs: string[] | null;
    date: Date;
    évènement: string;
    détails: unknown | null;
  }[]
> {
  const groupesParPersonne = directDatabaseConnection("cap_dossier")
    .join(
      "arête_cap_dossier__groupe_instructeurs",
      "arête_cap_dossier__groupe_instructeurs.cap_dossier",
      "cap_dossier.cap",
    )
    .join(
      "groupe_instructeurs",
      "groupe_instructeurs.id",
      "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    )
    .select("cap_dossier.personne_cap")
    .select(
      directDatabaseConnection.raw(
        "array_agg(DISTINCT groupe_instructeurs.nom ORDER BY groupe_instructeurs.nom) as groupes",
      ),
    )
    .groupBy("cap_dossier.personne_cap")
    .as("groupes_par_personne");

  return directDatabaseConnection("évènement_métrique")
    .join("personne", { "personne.id": "évènement_métrique.personne" })
    .leftJoin(groupesParPersonne, "groupes_par_personne.personne_cap", "personne.code_accès")
    .select(
      "personne.email",
      "groupes_par_personne.groupes as groupesInstructeurs",
      "évènement_métrique.date",
      "évènement_métrique.évènement",
      "évènement_métrique.détails",
    )
    .whereNot("personne.email", "like", "%beta.gouv%")
    .orderBy("évènement_métrique.date", "asc");
}

export async function supprimerÉvènementsAvantTelleDate(
  date: Date,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<number> {
  return databaseConnection("évènement_métrique").where("date", "<", date).delete();
}
