import { phases, prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

import type {
  EvenementAddPieceJointeDetails,
  EvenementMetrique,
  EvenementOpenModalAddPieceJointeDetails,
  DossierSearchEventDetails,
} from "@pitchou/types/evenement.d.ts";

function isDossierDetails(details: any): details is { dossierId: number } {
  if (Object(details) === details) {
    return Number.isInteger(details.dossierId);
  } else {
    return false;
  }
}

function isSearchDossierDetails(details: any): details is DossierSearchEventDetails {
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

function isOpenModalAddPieceJointeDetails(
  details: any,
): details is EvenementOpenModalAddPieceJointeDetails {
  return (
    Object(details) === details &&
    Number.isInteger(details.dossierId) &&
    pieceJointeModalSources.has(details.source)
  );
}

function isAddPieceJointeDetails(details: any): details is EvenementAddPieceJointeDetails {
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
      return !("details" in event);
    case "suivreUnDossier":
      return isDossierDetails(event.details);
    case "rechercherDesDossiers":
      return isSearchDossierDetails(event.details);
    case "modifierCommentaireInstruction":
      return !("details" in event);
    case "afficherLesDossiersSuivis":
      return !("details" in event);
    case "consulterUnDossier":
      return isDossierDetails(event.details);
    case "téléchargerListeÉspècesImpactées":
      return isDossierDetails(event.details);
    case "téléchargerCartographieProjet":
      return isDossierDetails(event.details);
    case "changerPhase": {
      return !("details" in event);
    }
    case "changerProchaineActionAttendueDe": {
      return !("details" in event);
    }
    case "ajouterDécisionAdministrative":
    case "modifierDécisionAdministrative":
    case "supprimerDécisionAdministrative": {
      return !("details" in event);
    }
    case "ajouterPrescription":
    case "modifierPrescription":
    case "supprimerPrescription": {
      return !("details" in event);
    }
    case "ajouterContrôle":
    case "modifierContrôle":
    case "supprimerContrôle": {
      return !("details" in event);
    }
    case "ajouterAvisExpert": {
      return !("details" in event);
    }
    case "modifierAvisExpert": {
      return !("details" in event);
    }
    case "supprimerAvisExpert": {
      return !("details" in event);
    }
    case "ouvrirModaleAjouterPieceJointe": {
      return isOpenModalAddPieceJointeDetails(event.details);
    }
    case "ajouterPieceJointe": {
      return isAddPieceJointeDetails(event.details);
    }
    case "générerUnDocument": {
      return !("details" in event);
    }
    case "retourÀLaConformité": {
      return typeof event.details.prescription === "string";
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
