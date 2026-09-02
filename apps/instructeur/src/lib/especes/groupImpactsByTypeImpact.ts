import {
  TYPE_IMPACT_NOT_PROVIDED,
  VALUE_NOT_PROVIDED,
  type EspecesByTypeImpact,
  type SimplifiedEspeceImpactee,
} from "./especesByTypeImpact.ts";

import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { QuantifiedImpact } from "@pitchou/types/especes.d.ts";

const criteriaValue: Map<QuantifiedImpact, (impact: FrontEndImpactOnEspece) => string> = new Map([
  ["Nombre d'individus", ({ nombreIndividus }) => nombreIndividus || VALUE_NOT_PROVIDED],
  ["Nids", ({ nids }) => (nids ? `${nids}` : VALUE_NOT_PROVIDED)],
  ["Œufs", ({ oeufs }) => (oeufs ? `${oeufs}` : VALUE_NOT_PROVIDED)],
  [
    "Surface habitat détruit (m²)",
    ({ surfaceHabitatDetruit }) =>
      surfaceHabitatDetruit ? `${surfaceHabitatDetruit}m²` : VALUE_NOT_PROVIDED,
  ],
]);

function toSimplifiedEspece(impact: FrontEndImpactOnEspece): SimplifiedEspeceImpactee {
  return {
    CD_REF: impact.espece.CD_REF,
    nomScientifique: impact.espece.nomScientifique,
    nomVernaculaire: impact.espece.nomVernaculaire,
    especeCNPN: impact.espece.especeCNPN,
    especeMinisterielle: impact.espece.especeMinisterielle,
    impactsValues: (impact.typeImpact?.criteriaAllowed ?? []).map((criteria) => {
      const value = criteriaValue.get(criteria);

      if (!value) {
        throw new Error(`Aucune valeur d'espèce à afficher pour le critère ${criteria}`);
      }

      return value(impact);
    }),
  };
}

/**
 * Lays out a dossier's impacts as the espèces tables show them: one section per type d'impact,
 * espèces sorted by nom scientifique inside each.
 *
 * The impacts already carry their libellés and the criteria their type d'impact allows — the
 * database resolved them — so this only groups and formats.
 */
export function groupImpactsByTypeImpact(impacts: FrontEndImpactOnEspece[]): EspecesByTypeImpact[] {
  // Grouped on the identifiant rather than on the libellé, which two types d'impact could share.
  const groupes: Map<string | undefined, EspecesByTypeImpact> = new Map();

  for (const impact of impacts) {
    const identifiant = impact.typeImpact?.identifiantPitchou;
    let groupe = groupes.get(identifiant);

    if (!groupe) {
      groupe = {
        typeImpact: impact.typeImpact?.libelle ?? TYPE_IMPACT_NOT_PROVIDED,
        criteriaAllowed: impact.typeImpact?.criteriaAllowed ?? [],
        especes: [],
      };
      groupes.set(identifiant, groupe);
    }

    groupe.especes.push(toSimplifiedEspece(impact));
  }

  return [...groupes.values()].map((groupe) => ({
    ...groupe,
    especes: groupe.especes.toSorted(({ nomScientifique: nom1 }, { nomScientifique: nom2 }) => {
      if (nom1 < nom2) {
        return -1;
      }
      if (nom1 > nom2) {
        return 1;
      }
      return 0;
    }),
  }));
}
