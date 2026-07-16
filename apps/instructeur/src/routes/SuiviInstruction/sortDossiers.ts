import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";

import { getCurrentPhaseStart } from "$lib/dossier/getCurrentPhaseStart.ts";

import type {
  DossierPhase,
  DossierNextActionExpectedFrom,
  DossierSummary,
} from "@pitchou/types/API_Pitchou.ts";

export const sortDossiersByColumnAlphabetically = (
  dossiers: DossierSummary[],
  columnName: keyof DossierSummary | "localisation" | "porteur de projet",
): DossierSummary[] => {
  return dossiers.toSorted((a, b) => {
    let columnA;
    let columnB;

    if (columnName === "localisation") {
      columnA = formatLocalisation(a).trim();
      columnB = formatLocalisation(b).trim();
    } else if (columnName === "porteur de projet") {
      columnA = formatPorteurDeProjet(a).trim();
      columnB = formatPorteurDeProjet(b).trim();
    } else {
      columnA = a[columnName];
      columnB = b[columnName];
    }

    if (columnA && typeof columnA === "string" && columnB && typeof columnB === "string") {
      return columnA.trim().localeCompare(columnB.trim(), "fr");
    }

    if (!columnA && columnB) return 1;
    if (columnA && !columnB) return -1;

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

const prochaineActionAttendueParToImportance: { [k in DossierNextActionExpectedFrom]: number } =
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
  prochaineActionAttenduePar1: DossierNextActionExpectedFrom,
  prochaineActionAttenduePar2: DossierNextActionExpectedFrom,
) {
  const importance1 = prochaineActionAttenduePar1
    ? prochaineActionAttendueParToImportance[prochaineActionAttenduePar1]
    : 11;
  const importance2 = prochaineActionAttenduePar2
    ? prochaineActionAttendueParToImportance[prochaineActionAttenduePar2]
    : 11;

  return importance2 - importance1;
}

export function sortDossiersByPhaseProchaineAction(dossiers: DossierSummary[]): DossierSummary[] {
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
        const { startDate: startDate1 } = getCurrentPhaseStart(dossier1);
        const { startDate: startDate2 } = getCurrentPhaseStart(dossier2);
        // the prochaineActionAttenduePar are also similar
        // compare on age (oldest dossier is the most relevant)

        return startDate1.getTime() - startDate2.getTime();
      }
    }
  });
}
