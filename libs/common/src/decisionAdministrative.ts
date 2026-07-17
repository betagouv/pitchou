import type { TypeDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

export const typesDecisionAdministrative: Set<TypeDecisionAdministrative> = new Set([
  "Arrêté dérogation",
  "Arrêté refus",
  "Arrêté modificatif",
  "Courrier",
  "Autre décision",
]);

// User-facing labels. The stored values (keys) stay unchanged; only the display text differs.
const decisionAdministrativeTypeLabels: Partial<Record<TypeDecisionAdministrative, string>> = {
  "Arrêté dérogation": "Arrêté de dérogation/AE",
};

export function labelForDecisionAdministrativeType(type: string): string {
  return decisionAdministrativeTypeLabels[type as TypeDecisionAdministrative] ?? type;
}
