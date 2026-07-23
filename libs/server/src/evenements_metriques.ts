import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type {
  EvenementAjouterPieceJointeDetails,
  EvenementMetrique,
  EvenementOuvrirModaleAjouterPieceJointeDetails,
  DossierSearchEventDetails,
} from "@pitchou/types/evenement.d.ts";

function isDossierDetails(details: any): details is { dossierId: number } {
  if (Object(details) === details) {
    return Number.isInteger(details.dossierId);
  } else {
    return false;
  }
}

function isRechercheDossierDetails(details: any): details is DossierSearchEventDetails {
  if (Object(details) !== details) {
    return false;
  }

  if (typeof details.resultCount !== "number") {
    return false;
  }

  if (!details.filters) {
    return false;
  }

  const filters = details.filters;

  if (filters.followedBy) {
    const followedBy = filters.followedBy;
    const isFollowedBy =
      typeof followedBy.selectedCount === "number" &&
      typeof followedBy.totalCount === "number" &&
      typeof followedBy.includesSelf === "boolean";

    if (!isFollowedBy) {
      return false;
    }
  }

  if (filters.withoutInstructeur !== undefined && typeof filters.withoutInstructeur !== "boolean") {
    return false;
  }

  if (filters.text !== undefined && typeof filters.text !== "string") {
    return false;
  }

  if (filters.activitesPrincipales && Array.isArray(filters.activitesPrincipales)) {
    const hasValidMainActivites = filters.activitesPrincipales.every(
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

  if (filters.nextActionExpectedFrom && Array.isArray(filters.nextActionExpectedFrom)) {
    const hasValidNextActionExpectedFrom = filters.nextActionExpectedFrom.every(
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
