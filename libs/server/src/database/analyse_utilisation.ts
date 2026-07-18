import { max as mostRecent } from "date-fns";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

export async function getDateDerniereUtilisationParInstructrice(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Map<NonNullable<Personne["email"]>, Date>> {
  const emailsEtDates = await databaseConnection("personne")
    .select(["email"])
    .max("horodatage as changement_de_phase_le_plus_récent")
    .max("date_dépôt as dépôt_le_plus_récent")
    .max("date_signature as date_signature_la_plus_récente")
    .max("date_saisine as date_saisine_la_plus_récente")
    .max("date_avis as date_avis_la_plus_récente")
    .join("arête_personne_suit_dossier", { "arête_personne_suit_dossier.personne": "personne.id" })
    .join("dossier", { "dossier.id": "arête_personne_suit_dossier.dossier" })
    .join("évènement_phase_dossier", { "évènement_phase_dossier.dossier": "dossier.id" })
    .leftJoin("décision_administrative", { "décision_administrative.dossier": "dossier.id" })
    .leftJoin("avis_expert", { "avis_expert.dossier": "dossier.id" })
    .groupBy("email");

  const dateDerniereUtilisationParInstructrice: Map<
    NonNullable<Personne["email"]>,
    Date
  > = new Map();

  for (const {
    email,
    changement_de_phase_le_plus_récent: changement_de_phase_le_plus_recent,
    dépôt_le_plus_récent: depot_le_plus_recent,
    date_signature_la_plus_récente: date_signature_la_plus_recente,
    date_saisine_la_plus_récente: date_saisine_la_plus_recente,
    date_avis_la_plus_récente: date_avis_la_plus_recente,
  } of emailsEtDates) {
    const mostRecentActivityDate = mostRecent([
      changement_de_phase_le_plus_recent,
      depot_le_plus_recent,
      date_signature_la_plus_recente,
      date_saisine_la_plus_recente,
      date_avis_la_plus_recente,
    ]);

    dateDerniereUtilisationParInstructrice.set(email, mostRecentActivityDate);
  }

  return dateDerniereUtilisationParInstructrice;
}
