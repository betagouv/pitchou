import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";

import { getCurrentPhaseStart } from "$lib/dossier/getCurrentPhaseStart.ts";

import type { DossierPhase, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

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
  "Étude recevabilité": 5,
  Instruction: 4,
  Contrôle: 3,
  "Classé sans suite": 2,
  "Obligations terminées": 1,
};

/**
 * Returns a positive number if phase1 is more important than phase2
 */
function comparePhase(phase1: DossierPhase, phase2: DossierPhase) {
  return phaseToImportance[phase2] - phaseToImportance[phase1];
}

const prochaineActionAttendueParToImportance: Readonly<Partial<Record<string, number>>> = {
  Instructeur: 10,
  "Consultation du public": 9,
  "CNPN/CSRPN": 8,
  Pétitionnaire: 7,
  "Préfet-e": 6,
  "Tierce personne/administration": 5,
};

/**
 * Returns a positive number if phase1 is more important than phase2
 */
function compareProchaineActionAttenduePar(
  prochaineActionAttenduePar1: DossierSummary["next_action_expected_from"],
  prochaineActionAttenduePar2: DossierSummary["next_action_expected_from"],
) {
  const importance1 = prochaineActionAttenduePar1
    ? (prochaineActionAttendueParToImportance[prochaineActionAttenduePar1] ?? 11)
    : 11;
  const importance2 = prochaineActionAttenduePar2
    ? (prochaineActionAttendueParToImportance[prochaineActionAttenduePar2] ?? 11)
    : 11;

  return importance2 - importance1;
}

export function sortDossiersByPhaseProchaineAction(dossiers: DossierSummary[]): DossierSummary[] {
  return dossiers.toSorted((dossier1, dossier2) => {
    const phase1 = dossier1.phase;
    const phase2 = dossier2.phase;

    const phaseComparison = comparePhase(phase1, phase2);

    if (phaseComparison !== 0) {
      return phaseComparison;
    }

    // For the same phase, compare who the next action is expected from.
    const prochaineActionAttenduePar1 = dossier1.next_action_expected_from;
    const prochaineActionAttenduePar2 = dossier2.next_action_expected_from;

    const prochaineActionAttendueParComparison = compareProchaineActionAttenduePar(
      prochaineActionAttenduePar1,
      prochaineActionAttenduePar2,
    );

    if (prochaineActionAttendueParComparison !== 0) {
      return prochaineActionAttendueParComparison;
    }

    // Break remaining ties by phase age, oldest first.
    const { startDate: startDate1 } = getCurrentPhaseStart(dossier1);
    const { startDate: startDate2 } = getCurrentPhaseStart(dossier2);
    return startDate1.getTime() - startDate2.getTime();
  });
}
