import { formatLocalisation, formatPorteurDeProjet } from "./affichageDossier.ts";

import { getDébutPhaseActuelle } from "./getDébutPhaseActuelle.ts";

import type {
  DossierPhase,
  DossierProchaineActionAttenduePar,
  DossierRésumé,
} from "../types/API_Pitchou.ts";

export const trierDossiersParOrdreAlphabétiqueColonne = (
  dossiers: DossierRésumé[],
  nomColonne: keyof DossierRésumé | "localisation" | "porteur de projet",
): DossierRésumé[] => {
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
  Contrôle: 3,
  "Classé sans suite": 2,
  "Obligations terminées": 1,
};

/**
 * Retourne un nombre positif si la phase1 est plus importante que la phase2
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
 * Retourne un nombre positif si la phase1 est plus importante que la phase2
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

export function trierDossiersParPhaseProchaineAction(dossiers: DossierRésumé[]): DossierRésumé[] {
  return dossiers.toSorted((dossier1, dossier2) => {
    const phase1 = dossier1.phase;
    const phase2 = dossier2.phase;

    // @ts-ignore
    const phaseComparison = comparePhase(phase1, phase2);

    if (phaseComparison !== 0) {
      return phaseComparison;
    } else {
      // les phases sont similaires,
      // comparer sur de qui la prochaine action est attendue
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
        const { dateDébut: dateDébut1 } = getDébutPhaseActuelle(dossier1);
        const { dateDébut: dateDébut2 } = getDébutPhaseActuelle(dossier2);
        // les prochaineActionAttenduePar sont aussi similaires
        // comparer sur l'ancienneté (dossier le plus ancien le plus pertinent)

        return dateDébut1.getTime() - dateDébut2.getTime();
      }
    }
  });
}
