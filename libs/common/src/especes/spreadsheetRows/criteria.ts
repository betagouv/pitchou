import type { ActiviteMenancante, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
import type { DescriptionImpact } from "@pitchou/types/especesImpact.d.ts";
import { isSpecified } from "./resolution.ts";
import type { ReportAnomalie } from "./resolution.ts";

const CRITERION: { champ: keyof DescriptionImpact; applicable: keyof ActiviteMenancante }[] = [
  { champ: "méthode", applicable: "Méthode" },
  { champ: "moyenDePoursuite", applicable: "Moyen de poursuite" },
  { champ: "nombreIndividus", applicable: "Nombre d'individus" },
  { champ: "nombreNids", applicable: "Nids" },
  { champ: "nombreOeufs", applicable: "Œufs" },
  { champ: "surfaceHabitatDétruit", applicable: "Surface habitat détruit (m²)" },
];

const LABEL_CRITERIA: Record<string, string> = {
  méthode: "méthode",
  moyenDePoursuite: "moyen de poursuite",
  nombreIndividus: "nombre d’individus",
  nombreNids: "nids",
  nombreOeufs: "œufs",
  surfaceHabitatDétruit: "surface habitat détruit",
};

export function validateCriteria(
  impact: DescriptionImpact,
  classification: ClassificationEtreVivant,
  ligne: number,
  report: ReportAnomalie,
): void {
  const activite = impact.activité;
  if (!activite) return;

  for (const { champ, applicable } of CRITERION) {
    if (!isSpecified(impact[champ]) || activite[applicable] === "Oui") continue;

    report({
      classification,
      ligne,
      message: `le critère « ${LABEL_CRITERIA[champ]} » ne s’applique pas au type d’impact « ${activite["Libellé Pitchou"]} » : la valeur a été ignorée`,
    });
    impact[champ] = undefined;
  }
}
