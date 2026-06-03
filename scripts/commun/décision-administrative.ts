import type { TypeDécisionAdministrative } from "../types/API_Pitchou.ts";

export const typesDécisionAdministrative: Set<TypeDécisionAdministrative> = new Set([
  "Arrêté dérogation",
  "Arrêté refus",
  "Arrêté modificatif",
  "Courrier",
  "Autre décision",
]);
