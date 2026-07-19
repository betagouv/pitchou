import type { DossierPhase, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

export function getCurrentPhaseStart(dossier: DossierSummary): {
  phase: DossierPhase;
  startDate: Date;
} {
  // This is too simplistic
  // PPP to revisit alongside https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
  const currentPhase: DossierPhase = dossier.phase;

  let startDate: Date;

  if (currentPhase === "Accompagnement amont") {
    startDate = dossier.depot_date;
  } else {
    startDate = dossier.phase_start_date;
  }

  return { startDate, phase: currentPhase };
}
