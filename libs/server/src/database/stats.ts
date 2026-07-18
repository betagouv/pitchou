import type { Knex } from "knex";
import { createTransaction } from "../database.ts";
import { formatISO, startOfToday } from "date-fns";

import type {
  StatsPubliques,
  StatsConformite,
  StatsImpactBiodiversite,
} from "@pitchou/types/API_Pitchou.ts";

/**
 * Computes Pitchou's public statistics
 */
export async function getStatsPubliques(): Promise<StatsPubliques> {
  const transaction = await createTransaction({ readOnly: true });
  const today = formatISO(startOfToday());
  try {
    // Fetch all the dossiers
    const dossiersP = transaction("dossier").select("id");

    // Fetch the dossiers currently in the contrôle phase
    const dossiersEnPhaseControleP = transaction("evenement_phase_dossier")
      .select("dossier")
      .max("timestamp as latest_timestamp")
      .where("phase", "Contrôle")
      .groupBy("dossier")
      .orderBy("latest_timestamp", "desc");

    const petitionnairesSinceSept2024P = transaction("dossier")
      .select(["demandeur_personne_morale", "demandeur_personne_physique"])
      .where("depot_date", "<=", "2024-09-30")
      .groupBy("demandeur_personne_morale", "demandeur_personne_physique");

    /** The prescriptions we're interested in are the controllable prescriptions, i.e. the prescriptions whose due date is in the past */
    const prescriptionsP = transaction("prescription")
      .select([
        "id",
        "avoided_surface",
        "compensated_surface",
        "avoided_nids",
        "compensated_nids",
        "avoided_individus",
        "compensated_individus",
      ])
      .where("due_date", "<=", today)
      .as("p");

    const controleP = transaction
      .select(["controle.prescription", "controle.result", "controle.controle_date"])
      .from("controle")
      .join(prescriptionsP, "controle.prescription", "p.id")
      .as("c");

    const prescriptionsControleesP = transaction
      .from(controleP)
      .countDistinct("prescription as nb")
      .first();

    const statsImpactBiodiversiteP = getStatsImpactBiodiversite(transaction, prescriptionsP);

    const statsConformiteP = getStatsConformite(transaction, controleP);

    const [
      dossiers,
      dossiersEnPhaseControle,
      petitionnairesSinceSept2024,
      statsConformite,
      prescriptions,
      prescriptionsControleesRow,
      statsImpactBiodiversite,
    ] = await Promise.all([
      dossiersP,
      dossiersEnPhaseControleP,
      petitionnairesSinceSept2024P,
      statsConformiteP,
      prescriptionsP,
      prescriptionsControleesP,
      statsImpactBiodiversiteP,
    ]);

    const totalPrescriptions = prescriptions.length;
    const numberPrescriptionsControlees = Number(prescriptionsControleesRow?.nb);

    const dossierIdsEnPhaseControle = dossiersEnPhaseControle.map((row) => row.dossier);

    // Fetch the décisions administratives for the dossiers in the Controle phase
    const decisionsForDossierEnPhaseControle = await transaction("evenement_phase_dossier as epd")
      .join("decision_administrative as da", "da.dossier", "epd.dossier")
      .whereIn("epd.dossier", dossierIdsEnPhaseControle)
      .whereNotNull("da.type")
      .distinct("epd.dossier")
      .select("epd.dossier");

    const stats: StatsPubliques = {
      totalDossiers: dossiers.length,
      nbDossiersEnPhaseControle: dossiersEnPhaseControle.length,
      nbDossiersEnPhaseControleAvecDecision: decisionsForDossierEnPhaseControle.length,
      nbDossiersEnPhaseControleSansDecision:
        dossiersEnPhaseControle.length - decisionsForDossierEnPhaseControle.length,
      nbPetitionnairesDepuisSept2024: petitionnairesSinceSept2024.length,
      totalPrescriptions,
      nbPrescriptionsControlees: numberPrescriptionsControlees,
      statsConformite,
      statsImpactBiodiversite,
    };

    await transaction.commit();
    return stats;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
}

/**
 * Fetches the statistics related to the distribution of prescriptions
 * according to the conformity of their last contrôle.
 */
async function getStatsConformite(
  transaction: Knex.Transaction | Knex,
  controleP: Knex.QueryBuilder,
): Promise<StatsConformite> {
  const controleCounts = transaction
    .from(controleP.as("controle"))
    .select("prescription")
    .count("* as controle_count")
    .groupBy("prescription");

  const lastControle = transaction
    .from(controleP.as("controle"))
    .select("prescription", "result", "controle_date")
    .distinctOn("prescription")
    .orderBy([
      { column: "prescription", order: "asc" },
      { column: "controle_date", order: "desc" },
    ]);

  const sqlQueryResults = await transaction
    .from(lastControle.as("dc"))
    .join(controleCounts.as("nc"), "dc.prescription", "nc.prescription")
    .select([
      transaction.raw(`COUNT(*) FILTER (WHERE dc.result = 'Non conforme') AS nb_non_conforme`),
      transaction.raw(`COUNT(*) FILTER (WHERE dc.result = 'Trop tard') AS nb_trop_tard`),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result NOT IN ('Conforme', 'Non conforme', 'Trop tard')) AS nb_conformite_autre`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 1) AS nb_conforme_apres_1`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 2) AS nb_conforme_apres_2`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count = 3) AS nb_conforme_apres_3`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.result = 'Conforme' AND nc.controle_count > 1) AS nb_retour_conformite`,
      ),
    ])
    .first();

  const stats: StatsConformite = {
    nb_non_conforme: Number(sqlQueryResults["nb_non_conforme"]),
    nb_conforme_apres_1: Number(sqlQueryResults["nb_conforme_apres_1"]),
    nb_conforme_apres_2: Number(sqlQueryResults["nb_conforme_apres_2"]),
    nb_conforme_apres_3: Number(sqlQueryResults["nb_conforme_apres_3"]),
    nb_trop_tard: Number(sqlQueryResults["nb_trop_tard"]),
    nb_retour_conformite: Number(sqlQueryResults["nb_retour_conformite"]),
  };

  return stats;
}

/**
 * Fetches the biodiversity impact statistics for prescriptions having at least one conforme contrôle.
 */
async function getStatsImpactBiodiversite(
  transaction: Knex.Transaction | Knex,
  prescriptionsP: Knex.QueryBuilder,
): Promise<StatsImpactBiodiversite> {
  const subQuery = transaction
    .from(prescriptionsP.as("p"))
    .join("controle", "p.id", "controle.prescription")
    .where("controle.result", "Conforme")
    .distinctOn("p.id")
    .select(
      "p.id",
      "p.avoided_surface",
      "p.compensated_surface",
      "p.avoided_nids",
      "p.compensated_nids",
      "p.avoided_individus",
      "p.compensated_individus",
    )
    .orderBy([
      { column: "p.id", order: "asc" },
      { column: "controle.controle_date", order: "desc" },
    ]);

  const result = await transaction
    .from(subQuery.as("prescriptions_conformes"))
    .select([
      transaction.raw("COUNT(*)::int AS total_prescriptions_conformes"),
      transaction.raw("SUM(COALESCE(avoided_surface, 0))::float AS total_avoided_surface"),
      transaction.raw("SUM(COALESCE(compensated_surface, 0))::float AS total_compensated_surface"),
      transaction.raw("SUM(COALESCE(avoided_nids, 0))::int AS total_avoided_nids"),
      transaction.raw("SUM(COALESCE(compensated_nids, 0))::int AS total_compensated_nids"),
      transaction.raw("SUM(COALESCE(avoided_individus, 0))::int AS total_avoided_individus"),
      transaction.raw(
        "SUM(COALESCE(compensated_individus, 0))::int AS total_compensated_individus",
      ),
    ])
    .first();

  const stats: StatsImpactBiodiversite = {
    total_prescriptions_conformes: Number(result.total_prescriptions_conformes),
    total_avoided_surface: Number(result.total_avoided_surface),
    total_compensated_surface: Number(result.total_compensated_surface),
    total_avoided_nids: Number(result.total_avoided_nids),
    total_compensated_nids: Number(result.total_compensated_nids),
    total_avoided_individus: Number(result.total_avoided_individus),
    total_compensated_individus: Number(result.total_compensated_individus),
  };

  return stats;
}
