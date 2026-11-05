import type { DossierPhase, DossierNextActionExpectedFrom } from "@pitchou/types/API_Pitchou.ts";

export const phases: Set<DossierPhase> = new Set([
  "Accompagnement amont",
  "Étude recevabilité",
  "Instruction",
  "Contrôle",
  "Classé sans suite",
  "Obligations terminées",
]);

// At equal timestamps, prefer the later phase in this order, regardless of author.
// Closed states follow active phases; Obligations terminées wins a tie with Classé sans suite.
export const phaseTieBreakOrder: readonly DossierPhase[] = [...phases];

export function comparePhaseEventsNewestFirst(
  a: { phase: DossierPhase; timestamp: Date | string | null; recorded_at?: Date | string },
  b: { phase: DossierPhase; timestamp: Date | string | null; recorded_at?: Date | string },
): number {
  // Match PostgreSQL timestamp precision 0, including optimistic events not saved yet.
  return (
    phaseEventOrderTime(b) - phaseEventOrderTime(a) ||
    phaseTieBreakOrder.indexOf(b.phase) - phaseTieBreakOrder.indexOf(a.phase)
  );
}

/** Recording time orders undated events; it is never their historical transition date. */
export function phaseEventOrderTime(event: {
  timestamp: Date | string | null;
  recorded_at?: Date | string;
}): number {
  const value = event.timestamp ?? event.recorded_at;
  return value ? Math.round(new Date(value).getTime() / 1000) : 0;
}

/**
 * The phases a dossier goes through, in order. « Classé sans suite » is left out: it ends
 * the dossier early, wherever it stood, so it has no place in the progression.
 */
export const orderedPhases: readonly DossierPhase[] = [
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
  "Préfet-e",
  "Tierce personne/administration",
]);
