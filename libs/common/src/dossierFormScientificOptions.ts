export const scientifiqueDemandeTypeOptions = [
  "Une/des capture(s)/relâcher(s) immédiat(s) sur place sans marquage",
  "Une/des capture(s)/relâcher(s) immédiat(s) sur place avec marquage",
  "Prélèvement de matériel biologique",
  "Autre cas",
] as const;

export const scientifiqueDemandePurposeOptions = [
  "Pour établissement public ayant une activité de recherche, pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre d'études scientifiques",
  "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'évaluation préalable et du suivi des impacts sur la biodiversité de projets de travaux, d'ouvrages et d'aménagements",
  "Pour la réalisation d'inventaires de populations d'espèces sauvages dans le cadre de l'élaboration ou du suivi de plans, de schémas, de programmes ou d'autres documents de planification nécessitant l'acquisition de connaissances ou visant à la préservation du patrimoine naturel prévus par des dispositions du code de l'environnement.",
] as const;

export function requiresScientificPurposes(scientifiqueDemandeType: readonly string[]): boolean {
  return scientifiqueDemandeType.some((value) =>
    scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
  );
}

export const scientifiqueCaptureModeOptions = ["Manuelle", "Au filet", "Avec épuisette"] as const;
