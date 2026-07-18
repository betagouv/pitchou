import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type {
  EvenementAjouterPieceJointeDetails,
  EvenementMetrique,
  EvenementOuvrirModaleAjouterPieceJointeDetails,
  EvenementRechercheDossiersDetails,
} from "@pitchou/types/evenement.d.ts";

function isDossierDetails(details: any): details is { dossierId: number } {
  if (Object(details) === details) {
    return Number.isInteger(details.dossierId);
  } else {
    return false;
  }
}

function isRechercheDossierDetails(details: any): details is EvenementRechercheDossiersDetails {
  if (Object(details) !== details) {
    return false;
  }

  if (typeof details.nombreRésultats !== "number") {
    return false;
  }

  if (!details.filtres) {
    return false;
  }

  const filters = details.filtres;

  if (filters.suiviPar) {
    const followedBy = filters.suiviPar;
    const isFollowedBy =
      typeof followedBy.nombreSéléctionnées === "number" &&
      typeof followedBy.nombreTotal === "number" &&
      typeof followedBy.inclusSoiMême === "boolean";

    if (!isFollowedBy) {
      return false;
    }
  }

  if (filters.sansInstructeurice !== undefined && typeof filters.sansInstructeurice !== "boolean") {
    return false;
  }

  if (filters.texte !== undefined && typeof filters.texte !== "string") {
    return false;
  }

  if (filters.activitésPrincipales && Array.isArray(filters.activitésPrincipales)) {
    const hasValidMainActivites = filters.activitésPrincipales.every(
      (activite: any) => typeof activite === "string",
    );

    if (!hasValidMainActivites) {
      return false;
    }
  }

  if (filters.phases && Array.isArray(filters.phases)) {
    const hasValidPhases = filters.phases.every((maybePhase: any) => {
      return phases.has(maybePhase);
    });
    if (!hasValidPhases) {
      return false;
    }
  }

  if (filters.prochaineActionAttenduePar && Array.isArray(filters.prochaineActionAttenduePar)) {
    const hasValidNextActionExpectedFrom = filters.prochaineActionAttenduePar.every(
      (maybeNextActionExpectedFrom: any) => {
        return (
          maybeNextActionExpectedFrom === "(vide)" ||
          prochaineActionAttenduePar.has(maybeNextActionExpectedFrom)
        );
      },
    );
    if (!hasValidNextActionExpectedFrom) {
      return false;
    }
  }

  return true;
}

const pieceJointeModalSources = new Set([
  "enteteDossier",
  "ongletPiecesJointes",
  "ongletAvis",
  "ongletControles",
  "ongletInstruction",
]);

const pieceJointeTypes = new Set([
  "Décision administrative",
  "Avis expert",
  "Saisine expert",
  "Autre",
]);

function isOuvertureModaleAjouterPieceJointeDetails(
  details: any,
): details is EvenementOuvrirModaleAjouterPieceJointeDetails {
  return (
    Object(details) === details &&
    Number.isInteger(details.dossierId) &&
    pieceJointeModalSources.has(details.source)
  );
}

function isAjouterPieceJointeDetails(details: any): details is EvenementAjouterPieceJointeDetails {
  return (
    Object(details) === details &&
    Number.isInteger(details.dossierId) &&
    pieceJointeModalSources.has(details.source) &&
    pieceJointeTypes.has(details.typePieceJointe) &&
    Number.isInteger(details.nombreFichiers) &&
    details.nombreFichiers > 0
  );
}

export function evenementMetriqueGuard(event: any): event is EvenementMetrique {
  if (!event.type) {
    return false;
  }

  const type: EvenementMetrique["type"] = event.type;

  switch (type) {
    case "seConnecter":
      return !("détails" in event);
    case "suivreUnDossier":
      return isDossierDetails(event.détails);
    case "rechercherDesDossiers":
      return isRechercheDossierDetails(event.détails);
    case "modifierCommentaireInstruction":
      return !("détails" in event);
    case "afficherLesDossiersSuivis":
      return !("détails" in event);
    case "consulterUnDossier":
      return isDossierDetails(event.détails);
    case "téléchargerListeÉspècesImpactées":
      return isDossierDetails(event.détails);
    case "téléchargerCartographieProjet":
      return isDossierDetails(event.détails);
    case "changerPhase": {
      return !("détails" in event);
    }
    case "changerProchaineActionAttendueDe": {
      return !("détails" in event);
    }
    case "ajouterDécisionAdministrative":
    case "modifierDécisionAdministrative":
    case "supprimerDécisionAdministrative": {
      return !("détails" in event);
    }
    case "ajouterPrescription":
    case "modifierPrescription":
    case "supprimerPrescription": {
      return !("détails" in event);
    }
    case "ajouterContrôle":
    case "modifierContrôle":
    case "supprimerContrôle": {
      return !("détails" in event);
    }
    case "ajouterAvisExpert": {
      return !("détails" in event);
    }
    case "modifierAvisExpert": {
      return !("détails" in event);
    }
    case "supprimerAvisExpert": {
      return !("détails" in event);
    }
    case "ouvrirModaleAjouterPieceJointe": {
      return isOuvertureModaleAjouterPieceJointeDetails(event.détails);
    }
    case "ajouterPieceJointe": {
      return isAjouterPieceJointeDetails(event.détails);
    }
    case "générerUnDocument": {
      return !("détails" in event);
    }
    case "retourÀLaConformité": {
      return typeof event.détails.prescription === "string";
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
