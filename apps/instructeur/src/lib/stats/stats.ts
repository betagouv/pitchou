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
    typeof stats.nbDossiersEnPhaseControle === "number" &&
    typeof stats.nbDossiersEnPhaseControleAvecDecision === "number" &&
    typeof stats.nbDossiersEnPhaseControleSansDecision === "number" &&
    typeof stats.nbPetitionnairesDepuisSept2024 === "number" &&
    typeof stats.totalDossiers === "number" &&
    typeof stats.totalPrescriptions === "number" &&
    typeof stats.nbPrescriptionsControlees === "number" &&
    Object(stats.statsConformite) === stats.statsConformite &&
    typeof stats.statsConformite.nb_non_conforme === "number" &&
    typeof stats.statsConformite.nb_trop_tard === "number" &&
    typeof stats.statsConformite.nb_conforme_apres_1 === "number" &&
    typeof stats.statsConformite.nb_conforme_apres_2 === "number" &&
    typeof stats.statsConformite.nb_conforme_apres_3 === "number" &&
    typeof stats.statsConformite.nb_retour_conformite === "number" &&
    typeof stats.statsImpactBiodiversite === "object" &&
    stats.statsImpactBiodiversite !== null &&
    typeof stats.statsImpactBiodiversite.total_prescriptions_conformes === "number" &&
    typeof stats.statsImpactBiodiversite.total_avoided_surface === "number" &&
    typeof stats.statsImpactBiodiversite.total_compensated_surface === "number" &&
    typeof stats.statsImpactBiodiversite.total_avoided_nids === "number" &&
    typeof stats.statsImpactBiodiversite.total_compensated_nids === "number" &&
    typeof stats.statsImpactBiodiversite.total_avoided_individus === "number" &&
    typeof stats.statsImpactBiodiversite.total_compensated_individus === "number"
  ) {
    /**
     * Creation of an object conforming to `StatsPubliques` solely for static-checking purposes.
     * This variable is only used to force a TypeScript error
     * if a property is added to `StatsPubliques` without updating this type guard.
     */
    let statsOk: Required<StatsPubliques> = {
      nbDossiersEnPhaseControle: 0,
      nbDossiersEnPhaseControleAvecDecision: 0,
      nbDossiersEnPhaseControleSansDecision: 0,
      nbPetitionnairesDepuisSept2024: 0,
      totalDossiers: 0,
      totalPrescriptions: 0,
      nbPrescriptionsControlees: 0,
      statsConformite: {
        nb_conforme_apres_1: 0,
        nb_conforme_apres_2: 0,
        nb_conforme_apres_3: 0,
        nb_non_conforme: 0,
        nb_retour_conformite: 0,
        nb_trop_tard: 0,
      },
      statsImpactBiodiversite: {
        total_compensated_individus: 0,
        total_avoided_individus: 0,
        total_compensated_nids: 0,
        total_avoided_nids: 0,
        total_prescriptions_conformes: 0,
        total_compensated_surface: 0,
        total_avoided_surface: 0,
      },
    };
    void statsOk; // to avoid a typescript error that the variable is unused

    return true;
  }
  return false;
}
