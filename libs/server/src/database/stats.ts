import type { Knex } from "knex";
import { creerTransaction } from "../database.ts";
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
  const transaction = await creerTransaction({ readOnly: true });
  const aujourdhui = formatISO(startOfToday());
  try {
    // Fetch all the dossiers
    const dossiersP = transaction("dossier").select("id");

    // Fetch the dossiers currently in the contrôle phase
    const dossiersEnPhaseControleP = transaction("évènement_phase_dossier")
      .select("dossier")
      .max("horodatage as latest_horodatage")
      .where("phase", "Controle")
      .groupBy("dossier")
      .orderBy("latest_horodatage", "desc");

    const petitionnairesDepuisSept2024P = transaction("dossier")
      .select(["demandeur_personne_morale", "demandeur_personne_physique"])
      .where("date_dépôt", "<=", "2024-09-30")
      .groupBy("demandeur_personne_morale", "demandeur_personne_physique");

    /** The prescriptions we're interested in are the controllable prescriptions, i.e. the prescriptions whose due date is in the past */
    const prescriptionsP = transaction("prescription")
      .select([
        "id",
        "surface_évitée",
        "surface_compensée",
        "nids_évités",
        "nids_compensés",
        "individus_évités",
        "individus_compensés",
      ])
      .where("date_échéance", "<=", aujourdhui)
      .as("p");

    const controleP = transaction
      .select(["contrôle.prescription", "contrôle.résultat", "contrôle.date_contrôle"])
      .from("contrôle")
      .join(prescriptionsP, "contrôle.prescription", "p.id")
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
      petitionnairesDepuisSept2024,
      statsConformite,
      prescriptions,
      prescriptionsControleesRow,
      statsImpactBiodiversite,
    ] = await Promise.all([
      dossiersP,
      dossiersEnPhaseControleP,
      petitionnairesDepuisSept2024P,
      statsConformiteP,
      prescriptionsP,
      prescriptionsControleesP,
      statsImpactBiodiversiteP,
    ]);

    const totalPrescriptions = prescriptions.length;
    const nbPrescriptionsControlees = Number(prescriptionsControleesRow?.nb);

    const dossiersIdsEnPhaseControle = dossiersEnPhaseControle.map((row) => row.dossier);

    // Fetch the décisions administratives for the dossiers in the Controle phase
    const decisionsPourDossierEnPhaseControle = await transaction("évènement_phase_dossier as epd")
      .join("décision_administrative as da", "da.dossier", "epd.dossier")
      .whereIn("epd.dossier", dossiersIdsEnPhaseControle)
      .whereNotNull("da.type")
      .distinct("epd.dossier")
      .select("epd.dossier");

    const stats: StatsPubliques = {
      totalDossiers: dossiers.length,
      nbDossiersEnPhaseControle: dossiersEnPhaseControle.length,
      nbDossiersEnPhaseControleAvecDécision: decisionsPourDossierEnPhaseControle.length,
      nbDossiersEnPhaseControleSansDécision:
        dossiersEnPhaseControle.length - decisionsPourDossierEnPhaseControle.length,
      nbPétitionnairesDepuisSept2024: petitionnairesDepuisSept2024.length,
      totalPrescriptions,
      nbPrescriptionsControlees,
      statsConformité: statsConformite,
      statsImpactBiodiversité: statsImpactBiodiversite,
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
  const nbControles = transaction
    .from(controleP.as("contrôle"))
    .select("prescription")
    .count("* as nb_contrôles")
    .groupBy("prescription");

  const dernierControle = transaction
    .from(controleP.as("contrôle"))
    .select("prescription", "résultat", "date_contrôle")
    .distinctOn("prescription")
    .orderBy([
      { column: "prescription", order: "asc" },
      { column: "date_contrôle", order: "desc" },
    ]);

  const resultatsRequeteSQL = await transaction
    .from(dernierControle.as("dc"))
    .join(nbControles.as("nc"), "dc.prescription", "nc.prescription")
    .select([
      transaction.raw(`COUNT(*) FILTER (WHERE dc.résultat = 'Non conforme') AS nb_non_conforme`),
      transaction.raw(`COUNT(*) FILTER (WHERE dc.résultat = 'Trop tard') AS nb_trop_tard`),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat NOT IN ('Conforme', 'Non conforme', 'Trop tard')) AS nb_conformite_autre`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 1) AS nb_conforme_apres_1`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 2) AS nb_conforme_apres_2`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles = 3) AS nb_conforme_apres_3`,
      ),
      transaction.raw(
        `COUNT(*) FILTER (WHERE dc.résultat = 'Conforme' AND nc.nb_contrôles > 1) AS nb_retour_conformite`,
      ),
    ])
    .first();

  const stats: StatsConformite = {
    nb_non_conforme: Number(resultatsRequeteSQL["nb_non_conforme"]),
    nb_conforme_apres_1: Number(resultatsRequeteSQL["nb_conforme_apres_1"]),
    nb_conforme_apres_2: Number(resultatsRequeteSQL["nb_conforme_apres_2"]),
    nb_conforme_apres_3: Number(resultatsRequeteSQL["nb_conforme_apres_3"]),
    nb_trop_tard: Number(resultatsRequeteSQL["nb_trop_tard"]),
    nb_retour_conformite: Number(resultatsRequeteSQL["nb_retour_conformite"]),
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
  const sousRequete = transaction
    .from(prescriptionsP.as("p"))
    .join("contrôle", "p.id", "contrôle.prescription")
    .where("contrôle.résultat", "Conforme")
    .distinctOn("p.id")
    .select(
      "p.id",
      "p.surface_évitée",
      "p.surface_compensée",
      "p.nids_évités",
      "p.nids_compensés",
      "p.individus_évités",
      "p.individus_compensés",
    )
    .orderBy([
      { column: "p.id", order: "asc" },
      { column: "contrôle.date_contrôle", order: "desc" },
    ]);

  const résultat = await transaction
    .from(sousRequete.as("prescriptions_conformes"))
    .select([
      transaction.raw("COUNT(*)::int AS total_prescriptions_conformes"),
      transaction.raw("SUM(COALESCE(surface_évitée, 0))::float AS total_surface_évitée"),
      transaction.raw("SUM(COALESCE(surface_compensée, 0))::float AS total_surface_compensée"),
      transaction.raw("SUM(COALESCE(nids_évités, 0))::int AS total_nids_évités"),
      transaction.raw("SUM(COALESCE(nids_compensés, 0))::int AS total_nids_compensés"),
      transaction.raw("SUM(COALESCE(individus_évités, 0))::int AS total_individus_évités"),
      transaction.raw("SUM(COALESCE(individus_compensés, 0))::int AS total_individus_compensés"),
    ])
    .first();

  const stats: StatsImpactBiodiversite = {
    total_prescriptions_conformes: Number(résultat.total_prescriptions_conformes),
    total_surface_évitée: Number(résultat.total_surface_évitée),
    total_surface_compensée: Number(résultat.total_surface_compensée),
    total_nids_évités: Number(résultat.total_nids_évités),
    total_nids_compensés: Number(résultat.total_nids_compensés),
    total_individus_évités: Number(résultat.total_individus_évités),
    total_individus_compensés: Number(résultat.total_individus_compensés),
  };

  return stats;
}
