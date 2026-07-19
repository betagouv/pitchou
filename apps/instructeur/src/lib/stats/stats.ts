import { json } from "d3-fetch";

import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";

/**
 * Loads the statistics from the backend
 */
export async function loadStats(): Promise<PublicStats> {
  try {
    const stats = await json(`/api/stats-publiques`);
    if (!isPublicStats(stats)) {
      throw new Error(
        `Réponse invalide reçue du serveur pour la route /api/stats-publiques. Réponse reçue : ${JSON.stringify(stats)}`,
      );
    }
    return stats;
  } catch (error) {
    console.error("Erreur lors du chargement des statistiques :", error);
    throw new Error(`${error}`);
  }
}

/**
 * Checks whether the provided object matches the expected structure of `PublicStats`.
 *
 * This type guard ensures that all required properties are present
 * and that they are indeed of type `number`. This guarantees conformity with
 * the `PublicStats` interface.
 *
 * If new properties are added to `PublicStats`, remember to update this type guard.
 */
function isPublicStats(stats: any): stats is PublicStats {
  if (
    Object(stats) === stats &&
    typeof stats.dossierCount === "number" &&
    typeof stats.controlePhaseDossierCount === "number" &&
    typeof stats.controlePhaseDossierWithDecisionCount === "number" &&
    typeof stats.controlePhaseDossierWithoutDecisionCount === "number" &&
    typeof stats.petitionnaireCountSinceSeptember2024 === "number" &&
    typeof stats.controllablePrescriptionCount === "number" &&
    typeof stats.prescriptionWithControleCount === "number" &&
    Object(stats.conformiteStats) === stats.conformiteStats &&
    typeof stats.conformiteStats.nonConformePrescriptionCount === "number" &&
    typeof stats.conformiteStats.tooLatePrescriptionCount === "number" &&
    typeof stats.conformiteStats.prescriptionConformeAfterFirstControleCount === "number" &&
    typeof stats.conformiteStats.prescriptionConformeAfterSecondControleCount === "number" &&
    typeof stats.conformiteStats.prescriptionConformeAfterThirdControleCount === "number" &&
    typeof stats.conformiteStats.prescriptionReturnedToConformiteCount === "number" &&
    Object(stats.biodiversiteImpactStats) === stats.biodiversiteImpactStats &&
    typeof stats.biodiversiteImpactStats.conformePrescriptionCount === "number" &&
    typeof stats.biodiversiteImpactStats.avoidedSurfaceTotal === "number" &&
    typeof stats.biodiversiteImpactStats.compensatedSurfaceTotal === "number" &&
    typeof stats.biodiversiteImpactStats.avoidedNidsCount === "number" &&
    typeof stats.biodiversiteImpactStats.compensatedNidsCount === "number" &&
    typeof stats.biodiversiteImpactStats.avoidedIndividusCount === "number" &&
    typeof stats.biodiversiteImpactStats.compensatedIndividusCount === "number"
  ) {
    /**
     * Creation of an object conforming to `PublicStats` solely for static-checking purposes.
     * This variable is only used to force a TypeScript error
     * if a property is added to `PublicStats` without updating this type guard.
     */
    const statsShape: Required<PublicStats> = {
      dossierCount: 0,
      controlePhaseDossierCount: 0,
      controlePhaseDossierWithDecisionCount: 0,
      controlePhaseDossierWithoutDecisionCount: 0,
      petitionnaireCountSinceSeptember2024: 0,
      controllablePrescriptionCount: 0,
      prescriptionWithControleCount: 0,
      conformiteStats: {
        nonConformePrescriptionCount: 0,
        tooLatePrescriptionCount: 0,
        prescriptionConformeAfterFirstControleCount: 0,
        prescriptionConformeAfterSecondControleCount: 0,
        prescriptionConformeAfterThirdControleCount: 0,
        prescriptionReturnedToConformiteCount: 0,
      },
      biodiversiteImpactStats: {
        conformePrescriptionCount: 0,
        avoidedSurfaceTotal: 0,
        compensatedSurfaceTotal: 0,
        avoidedNidsCount: 0,
        compensatedNidsCount: 0,
        avoidedIndividusCount: 0,
        compensatedIndividusCount: 0,
      },
    };
    void statsShape;

    return true;
  }
  return false;
}
