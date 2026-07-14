import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type {
  EvenementAjouterPieceJointeDetails,
  EvenementMetrique,
  EvenementOuvrirModaleAjouterPieceJointeDetails,
  EvenementRechercheDossiersDetails,
} from "@pitchou/types/evenement.d.ts";

function estDetailsDossier(détails: any): détails is { dossierId: number } {
  if (Object(détails) === détails) {
    return Number.isInteger(détails.dossierId);
  } else {
    return false;
  }
}

function estRechercheDossierDetails(détails: any): détails is EvenementRechercheDossiersDetails {
  if (Object(détails) !== détails) {
    return false;
  }

  if (typeof détails.nombreRésultats !== "number") {
    return false;
  }

  if (!détails.filtres) {
    return false;
  }

  const filtres = détails.filtres;

  if (filtres.suiviPar) {
    const suiviPar = filtres.suiviPar;
    const estSuiviPar =
      typeof suiviPar.nombreSéléctionnées === "number" &&
      typeof suiviPar.nombreTotal === "number" &&
      typeof suiviPar.inclusSoiMême === "boolean";

    if (!estSuiviPar) {
      return false;
    }
  }

  if (filtres.sansInstructeurice !== undefined && typeof filtres.sansInstructeurice !== "boolean") {
    return false;
  }

  if (filtres.texte !== undefined && typeof filtres.texte !== "string") {
    return false;
  }

  if (filtres.activitésPrincipales && Array.isArray(filtres.activitésPrincipales)) {
    const estActivitesPrincipales = filtres.activitésPrincipales.every(
      (activite: any) => typeof activite === "string",
    );

    if (!estActivitesPrincipales) {
      return false;
    }
  }

  if (filtres.phases && Array.isArray(filtres.phases)) {
    const estPhases = filtres.phases.every((peutEtrePhase: any) => {
      return phases.has(peutEtrePhase);
    });
    if (!estPhases) {
      return false;
    }
  }

  if (filtres.prochaineActionAttenduePar && Array.isArray(filtres.prochaineActionAttenduePar)) {
    const estProchaineActionAttenduePar = filtres.prochaineActionAttenduePar.every(
      (peutProchaineActionPar: any) => {
        return (
          peutProchaineActionPar === "(vide)" ||
          prochaineActionAttenduePar.has(peutProchaineActionPar)
        );
      },
    );
    if (!estProchaineActionAttenduePar) {
      return false;
    }
  }

  return true;
}

const sourcesOuvertureModaleAjouterPieceJointe = new Set([
  "enteteDossier",
  "ongletPiecesJointes",
  "ongletAvis",
  "ongletControles",
  "ongletInstruction",
]);

const typesPieceJointe = new Set([
  "Décision administrative",
  "Avis expert",
  "Saisine expert",
  "Autre",
]);

function estOuvertureModaleAjouterPieceJointeDetails(
  détails: any,
): détails is EvenementOuvrirModaleAjouterPieceJointeDetails {
  return (
    Object(détails) === détails &&
    Number.isInteger(détails.dossierId) &&
    sourcesOuvertureModaleAjouterPieceJointe.has(détails.source)
  );
}

function estAjouterPieceJointeDetails(détails: any): détails is EvenementAjouterPieceJointeDetails {
  return (
    Object(détails) === détails &&
    Number.isInteger(détails.dossierId) &&
    sourcesOuvertureModaleAjouterPieceJointe.has(détails.source) &&
    typesPieceJointe.has(détails.typePieceJointe) &&
    Number.isInteger(détails.nombreFichiers) &&
    détails.nombreFichiers > 0
  );
}

export function evenementMetriqueGuard(évènement: any): évènement is EvenementMetrique {
  if (!évènement.type) {
    return false;
  }

  const type: EvenementMetrique["type"] = évènement.type;

  switch (type) {
    case "seConnecter":
      return !("détails" in évènement);
    case "suivreUnDossier":
      return estDetailsDossier(évènement.détails);
    case "rechercherDesDossiers":
      return estRechercheDossierDetails(évènement.détails);
    case "modifierCommentaireInstruction":
      return !("détails" in évènement);
    case "afficherLesDossiersSuivis":
      return !("détails" in évènement);
    case "consulterUnDossier":
      return estDetailsDossier(évènement.détails);
    case "téléchargerListeÉspècesImpactées":
      return estDetailsDossier(évènement.détails);
    case "téléchargerCartographieProjet":
      return estDetailsDossier(évènement.détails);
    case "changerPhase": {
      return !("details" in évènement);
    }
    case "changerProchaineActionAttendueDe": {
      return !("details" in évènement);
    }
    case "ajouterDecisionAdministrative":
    case "modifierDecisionAdministrative":
    case "supprimerDecisionAdministrative": {
      return !("details" in évènement);
    }
    case "ajouterPrescription":
    case "modifierPrescription":
    case "supprimerPrescription": {
      return !("details" in évènement);
    }
    case "ajouterControle":
    case "modifierControle":
    case "supprimerControle": {
      return !("details" in évènement);
    }
    case "ajouterAvisExpert": {
      return !("details" in évènement);
    }
    case "modifierAvisExpert": {
      return !("details" in évènement);
    }
    case "supprimerAvisExpert": {
      return !("details" in évènement);
    }
    case "ouvrirModaleAjouterPieceJointe": {
      return estOuvertureModaleAjouterPieceJointeDetails(évènement.détails);
    }
    case "ajouterPieceJointe": {
      return estAjouterPieceJointeDetails(évènement.détails);
    }
    case "générerUnDocument": {
      return !("details" in évènement);
    }
    case "retourÀLaConformité": {
      return typeof évènement.détails.prescription === "string";
    }
    default: {
      // So that TypeScript detects if we forgot a 'case'
      const neverType: never = type;

      // pretend to use it to satisfy TypeScript
      void neverType;

      console.error(`le type d'événement '${type}' est inconnu`);
      return false;
    }
  }
}
