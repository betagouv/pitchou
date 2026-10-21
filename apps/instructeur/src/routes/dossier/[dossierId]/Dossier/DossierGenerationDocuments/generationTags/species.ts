import type { EspecesByTypeImpact } from "#lib/especes/especesByTypeImpact.ts";
export function speciesTags(groupedEspecesByTypeImpact: EspecesByTypeImpact[] | undefined) {
  return groupedEspecesByTypeImpact?.map(({ especes, typeImpact, criteriaAllowed }) => ({
    liste_espèces: especes.map(
      ({ nomVernaculaire, nomScientifique, impactsValues, especeCNPN, especeMinisterielle }) => ({
        nomVernaculaire,
        nomScientifique,
        liste_impacts_quantifiés: impactsValues,
        estCNPN: especeCNPN,
        estMinistérielle: especeMinisterielle,
      }),
    ),
    impact: typeImpact,
    liste_noms_impacts_quantifiés: criteriaAllowed,
  }));
}
