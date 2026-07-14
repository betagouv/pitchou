import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/affichageDossier.ts";

import { getDebutPhaseActuelle } from "$lib/dossier/getDebutPhaseActuelle.ts";

import type {
  DossierPhase,
  DossierProchaineActionAttenduePar,
  DossierResume,
} from "@pitchou/types/API_Pitchou.ts";

export const trierDossiersParOrdreAlphabetiqueColonne = (
  dossiers: DossierResume[],
  nomColonne: keyof DossierResume | "localisation" | "porteur de projet",
): DossierResume[] => {
  return dossiers.toSorted((a, b) => {
    let colonneA;
    let colonneB;

    if (nomColonne === "localisation") {
      colonneA = formatLocalisation(a).trim();
      colonneB = formatLocalisation(b).trim();
    } else if (nomColonne === "porteur de projet") {
      colonneA = formatPorteurDeProjet(a).trim();
      colonneB = formatPorteurDeProjet(b).trim();
    } else {
      colonneA = a[nomColonne];
      colonneB = b[nomColonne];
    }

    if (colonneA && typeof colonneA === "string" && colonneB && typeof colonneB === "string") {
      return colonneA.trim().localeCompare(colonneB.trim(), "fr");
    }

    if (!colonneA && colonneB) return 1;
    if (colonneA && !colonneB) return -1;

    return 0;
  });
};

const phaseToImportance: { [k in DossierPhase]: number } = {
  "Accompagnement amont": 6,
  "Étude recevabilité DDEP": 5,
  Instruction: 4,
  Controle: 3,
  "Classé sans suite": 2,
  "Obligations terminées": 1,
};

/**
 * Returns a positive number if phase1 is more important than phase2
 */
function comparePhase(phase1: DossierPhase, phase2: DossierPhase) {
  return phaseToImportance[phase2] - phaseToImportance[phase1];
}

const prochaineActionAttendueParToImportance: { [k in DossierProchaineActionAttenduePar]: number } =
  {
    Instructeur: 10,
    "Consultation du public": 9,
    "CNPN/CSRPN": 8,
    Pétitionnaire: 7,
    "Autre administration": 6,
    Autre: 5,
    Personne: 4,
  };

/**
 * Returns a positive number if phase1 is more important than phase2
 */
function compareProchaineActionAttenduePar(
  prochaineActionAttenduePar1: DossierProchaineActionAttenduePar,
  prochaineActionAttenduePar2: DossierProchaineActionAttenduePar,
) {
  const importance1 = prochaineActionAttenduePar1
    ? prochaineActionAttendueParToImportance[prochaineActionAttenduePar1]
    : 11;
  const importance2 = prochaineActionAttenduePar2
    ? prochaineActionAttendueParToImportance[prochaineActionAttenduePar2]
    : 11;

  return importance2 - importance1;
}

export function trierDossiersParPhaseProchaineAction(dossiers: DossierResume[]): DossierResume[] {
  return dossiers.toSorted((dossier1, dossier2) => {
    const phase1 = dossier1.phase;
    const phase2 = dossier2.phase;

    // @ts-ignore
    const phaseComparison = comparePhase(phase1, phase2);

    if (phaseComparison !== 0) {
      return phaseComparison;
    } else {
      // phases are similar,
      // compare on who the next action is expected from
      const prochaineActionAttenduePar1 = dossier1.prochaine_action_attendue_par;
      const prochaineActionAttenduePar2 = dossier2.prochaine_action_attendue_par;

      const prochaineActionAttendueParComparison = compareProchaineActionAttenduePar(
        // @ts-ignore
        prochaineActionAttenduePar1,
        prochaineActionAttenduePar2,
      );

      if (prochaineActionAttendueParComparison !== 0) {
        return prochaineActionAttendueParComparison;
      } else {
        const { dateDébut: dateDebut1 } = getDebutPhaseActuelle(dossier1);
        const { dateDébut: dateDebut2 } = getDebutPhaseActuelle(dossier2);
        // the prochaineActionAttenduePar are also similar
        // compare on age (oldest dossier is the most relevant)

        return dateDebut1.getTime() - dateDebut2.getTime();
      }
    }
  });
}
