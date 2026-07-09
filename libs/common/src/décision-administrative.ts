import type { TypeDécisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

export const typesDécisionAdministrative: Set<TypeDécisionAdministrative> = new Set([
  "Arrêté dérogation",
  "Arrêté refus",
  "Arrêté modificatif",
  "Courrier",
  "Autre décision",
]);

// User-facing labels. The stored values (keys) stay unchanged; only the display text differs.
const decisionAdministrativeTypeLabels: Partial<Record<TypeDécisionAdministrative, string>> = {
  "Arrêté dérogation": "Arrêté de dérogation/AE",
};

export function labelForDecisionAdministrativeType(type: string): string {
  return decisionAdministrativeTypeLabels[type as TypeDécisionAdministrative] ?? type;
}
