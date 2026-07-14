import type { DossierPhase, DossierResume } from "@pitchou/types/API_Pitchou.ts";

export function getDebutPhaseActuelle(dossier: DossierResume): {
  phase: DossierPhase;
  dateDébut: Date;
} {
  // This is too simplistic
  // PPP to revisit alongside https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
  const phaseActuelle: DossierPhase = dossier.phase;

  let dateDebut: Date;

  if (phaseActuelle === "Accompagnement amont") {
    dateDebut = dossier.date_dépôt;
  } else {
    dateDebut = dossier.date_début_phase;
  }

  return { dateDébut: dateDebut, phase: phaseActuelle };
}
