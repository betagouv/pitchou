export interface PublicStats {
  dossierCount: number;
  controlePhaseDossierCount: number;
  controlePhaseDossierWithDecisionCount: number;
  controlePhaseDossierWithoutDecisionCount: number;
  petitionnaireCountSinceSeptember2024: number;
  controllablePrescriptionCount: number;
  prescriptionWithControleCount: number;
  conformiteStats: ConformiteStats;
  biodiversiteImpactStats: BiodiversiteImpactStats;
}

export interface ConformiteStats {
  nonConformePrescriptionCount: number;
  tooLatePrescriptionCount: number;
  prescriptionConformeAfterFirstControleCount: number;
  prescriptionConformeAfterSecondControleCount: number;
  prescriptionConformeAfterThirdControleCount: number;
  prescriptionReturnedToConformiteCount: number;
}

export interface BiodiversiteImpactStats {
  conformePrescriptionCount: number;
  avoidedSurfaceTotal: number;
  compensatedSurfaceTotal: number;
  avoidedNidsCount: number;
  compensatedNidsCount: number;
  avoidedIndividusCount: number;
  compensatedIndividusCount: number;
}
