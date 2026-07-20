import { max as mostRecent } from "date-fns";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";

export async function getLastUsageDateByInstructrice(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Map<NonNullable<Personne["email"]>, Date>> {
  const emailsAndDates = await databaseConnection("personne")
    .select(["email"])
    .max("timestamp as most_recent_phase_change")
    .max("depot_date as most_recent_depot")
    .max("signature_date as most_recent_signature")
    .max("saisine_date as most_recent_saisine")
    .max("avis_date as most_recent_avis")
    .join("edge_personne_follows_dossier", {
      "edge_personne_follows_dossier.personne": "personne.id",
    })
    .join("dossier", { "dossier.id": "edge_personne_follows_dossier.dossier" })
    .join("evenement_phase_dossier", { "evenement_phase_dossier.dossier": "dossier.id" })
    .leftJoin("decision_administrative", { "decision_administrative.dossier": "dossier.id" })
    .leftJoin("avis_expert", { "avis_expert.dossier": "dossier.id" })
    .groupBy("email");

  const lastUsageDateByInstructrice: Map<NonNullable<Personne["email"]>, Date> = new Map();

  for (const {
    email,
    most_recent_phase_change,
    most_recent_depot,
    most_recent_signature,
    most_recent_saisine,
    most_recent_avis,
  } of emailsAndDates) {
    const mostRecentActivityDate = mostRecent([
      most_recent_phase_change,
      most_recent_depot,
      most_recent_signature,
      most_recent_saisine,
      most_recent_avis,
    ]);

    lastUsageDateByInstructrice.set(email, mostRecentActivityDate);
  }

  return lastUsageDateByInstructrice;
}
