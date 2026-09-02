import type { QuantifiedImpact } from "@pitchou/types/especes.d.ts";

export const VALUE_NOT_PROVIDED = `(non renseigné)`;

export const TYPE_IMPACT_NOT_PROVIDED = `Type d'impact non-renseignée`;

export type SimplifiedEspeceImpactee = {
  nomVernaculaire: string;
  nomScientifique: string;
  CD_REF: string;
  especeMinisterielle: boolean;
  especeCNPN: boolean;
  /** The value of each criteria in `criteriaAllowed`, in the same order, already formatted. */
  impactsValues: string[];
};

export type EspecesByTypeImpact = {
  typeImpact: string;
  criteriaAllowed: QuantifiedImpact[];
  especes: SimplifiedEspeceImpactee[];
};

export function byNomScientifique(
  { nomScientifique: nom1 }: SimplifiedEspeceImpactee,
  { nomScientifique: nom2 }: SimplifiedEspeceImpactee,
): number {
  if (nom1 < nom2) {
    return -1;
  }
  if (nom1 > nom2) {
    return 1;
  }
  return 0;
}
