import type { DossierPhase, DossierNextActionExpectedFrom } from "@pitchou/types/API_Pitchou.ts";

export const phases: Set<DossierPhase> = new Set([
  "Accompagnement amont",
  "Étude recevabilité",
  "Instruction",
  "Contrôle",
  "Classé sans suite",
  "Obligations terminées",
]);

/**
 * The phases a dossier goes through, in order. « Classé sans suite » is left out: it ends
 * the dossier early, wherever it stood, so it has no place in the progression.
 */
const orderedPhases: DossierPhase[] = [
  "Accompagnement amont",
  "Étude recevabilité",
  "Instruction",
  "Contrôle",
  "Obligations terminées",
];

/**
 * How far along the phase progression a dossier is, between 0 and 1. A dossier « classé sans
 * suite » is done, so it reports a full progression.
 */
export function phaseProgress(phase: DossierPhase): number {
  const index = orderedPhases.indexOf(phase);
  return index === -1 ? 1 : (index + 1) / orderedPhases.length;
}

export const prochaineActionAttenduePar: Set<DossierNextActionExpectedFrom> = new Set([
  "Instructeur",
  "CNPN/CSRPN",
  "Pétitionnaire",
  "Consultation du public",
  "Autre administration",
  "Autre",
  "Personne",
]);
