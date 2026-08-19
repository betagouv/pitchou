import type {
  DossierPhase,
  DossierNextActionExpected,
  DossierNextActionExpectedFrom,
} from "@pitchou/types/API_Pitchou.ts";

export const phases: Set<DossierPhase> = new Set([
  "Accompagnement amont",
  "Étude recevabilité DDEP",
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
  "Étude recevabilité DDEP",
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
  "Préfet·e",
  "Autre",
  "Personne",
]);

/**
 * The next expected actions available for each entity in charge of the next action.
 * Entities absent from this map have no suggested action.
 */
export const prochainesActionsAttenduesParEntite: ReadonlyMap<
  DossierNextActionExpectedFrom,
  DossierNextActionExpected[]
> = new Map([
  ["Pétitionnaire", ["Compléter le dossier"]],
  ["Instructeur", ["Envoyer la saisine", "Consulter le dossier"]],
  ["Préfet·e", ["Signer l'arrêté"]],
]);

export const prochainesActionsAttendues: Set<DossierNextActionExpected> = new Set(
  [...prochainesActionsAttenduesParEntite.values()].flat(),
);
