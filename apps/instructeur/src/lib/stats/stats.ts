import { json } from "d3-fetch";

import type { StatsPubliques } from "@pitchou/types/API_Pitchou.ts";

/**
 * Loads the statistics from the backend
 */
export async function loadStats(): Promise<StatsPubliques> {
  try {
    const stats = await json(`/api/stats-publiques`);
    if (!isStatsPubliques(stats)) {
      throw new Error(
        `Réponse invalide reçue du serveur pour la route /api/stats-publiques. Réponse reçue : ${JSON.stringify(stats)}`,
      );
    }
    return stats as StatsPubliques;
  } catch (error) {
    console.error("Erreur lors du chargement des statistiques :", error);
    throw new Error(`${error}`);
  }
}

/**
 * Checks whether the provided object matches the expected structure of `StatsPubliques`.
 *
 * This type guard ensures that all required properties are present
 * and that they are indeed of type `number`. This guarantees conformity with
 * the `StatsPubliques` interface.
 *
 * If new properties are added to `StatsPubliques`, remember to update this type guard.
 */
function isStatsPubliques(stats: any): stats is StatsPubliques {
  console.log({ stats });
  if (
    Object(stats) === stats &&
    typeof stats.nbDossiersEnPhaseContrôle === "number" &&
    typeof stats.nbDossiersEnPhaseContrôleAvecDécision === "number" &&
    typeof stats.nbDossiersEnPhaseContrôleSansDécision === "number" &&
    typeof stats.nbPétitionnairesDepuisSept2024 === "number" &&
    typeof stats.totalDossiers === "number" &&
    typeof stats.totalPrescriptions === "number" &&
    typeof stats.nbPrescriptionsControlees === "number" &&
    Object(stats.statsConformité) === stats.statsConformité &&
    typeof stats.statsConformité.nb_non_conforme === "number" &&
    typeof stats.statsConformité.nb_trop_tard === "number" &&
    typeof stats.statsConformité.nb_conforme_apres_1 === "number" &&
    typeof stats.statsConformité.nb_conforme_apres_2 === "number" &&
    typeof stats.statsConformité.nb_conforme_apres_3 === "number" &&
    typeof stats.statsConformité.nb_retour_conformite === "number" &&
    typeof stats.statsImpactBiodiversité === "object" &&
    stats.statsImpactBiodiversité !== null &&
    typeof stats.statsImpactBiodiversité.total_prescriptions_conformes === "number" &&
    typeof stats.statsImpactBiodiversité.total_surface_évitée === "number" &&
    typeof stats.statsImpactBiodiversité.total_surface_compensée === "number" &&
    typeof stats.statsImpactBiodiversité.total_nids_évités === "number" &&
    typeof stats.statsImpactBiodiversité.total_nids_compensés === "number" &&
    typeof stats.statsImpactBiodiversité.total_individus_évités === "number" &&
    typeof stats.statsImpactBiodiversité.total_individus_compensés === "number"
  ) {
    /**
     * Creation of an object conforming to `StatsPubliques` solely for static-checking purposes.
     * This variable is only used to force a TypeScript error
     * if a property is added to `StatsPubliques` without updating this type guard.
     */
    let statsOk: Required<StatsPubliques> = {
      nbDossiersEnPhaseContrôle: 0,
      nbDossiersEnPhaseContrôleAvecDécision: 0,
      nbDossiersEnPhaseContrôleSansDécision: 0,
      nbPétitionnairesDepuisSept2024: 0,
      totalDossiers: 0,
      totalPrescriptions: 0,
      nbPrescriptionsControlees: 0,
      statsConformité: {
        nb_conforme_apres_1: 0,
        nb_conforme_apres_2: 0,
        nb_conforme_apres_3: 0,
        nb_non_conforme: 0,
        nb_retour_conformite: 0,
        nb_trop_tard: 0,
      },
      statsImpactBiodiversité: {
        total_individus_compensés: 0,
        total_individus_évités: 0,
        total_nids_compensés: 0,
        total_nids_évités: 0,
        total_prescriptions_conformes: 0,
        total_surface_compensée: 0,
        total_surface_évitée: 0,
      },
    };
    void statsOk; // to avoid a typescript error that the variable is unused

    return true;
  }
  return false;
}
