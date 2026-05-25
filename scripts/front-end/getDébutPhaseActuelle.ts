import type { DossierPhase, DossierRésumé } from "../types/API_Pitchou.ts";

export function getDébutPhaseActuelle(dossier: DossierRésumé): {
  phase: DossierPhase;
  dateDébut: Date;
} {
  // C'est trop simpliste
  // PPP à revoir à l'occasion de https://trello.com/c/GmhEx16G/420-un-dossier-qui-passe-en-instruction-dans-ds-reste-en-instruction-dans-pitchou
  const phaseActuelle: DossierPhase = dossier.phase;

  let dateDébut: Date;

  if (phaseActuelle === "Accompagnement amont") {
    dateDébut = dossier.date_dépôt;
  } else {
    dateDébut = dossier.date_début_phase;
  }

  return { dateDébut, phase: phaseActuelle };
}
