import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import {
  isAddPieceJointeDetails,
  isAssignDossierFollowersDetails,
  isClickNavbarLinkDetails,
  isDossierDetails,
  isOpenModalAddPieceJointeDetails,
  isSearchDossierDetails,
} from "./evenements_metriques_details.ts";

export function evenementMetriqueGuard(event: any): event is EvenementMetrique {
  if (!event.type) return false;
  const type: EvenementMetrique["type"] = event.type;
  switch (type) {
    case "seConnecter":
    case "modifierCommentaireInstruction":
    case "afficherLesDossiersSuivis":
    case "changerPhase":
    case "changerProchaineActionAttendueDe":
    case "ajouterDécisionAdministrative":
    case "modifierDécisionAdministrative":
    case "supprimerDécisionAdministrative":
    case "ajouterPrescription":
    case "modifierPrescription":
    case "supprimerPrescription":
    case "ajouterContrôle":
    case "modifierContrôle":
    case "supprimerContrôle":
    case "ajouterAvisExpert":
    case "modifierAvisExpert":
    case "supprimerAvisExpert":
    case "générerUnDocument":
      return !("details" in event);
    case "suivreUnDossier":
    case "consulterUnDossier":
    case "téléchargerListeÉspècesImpactées":
    case "téléchargerCartographieProjet":
      return isDossierDetails(event.details);
    case "assignDossierFollowers":
      return isAssignDossierFollowersDetails(event.details);
    case "rechercherDesDossiers":
      return isSearchDossierDetails(event.details);
    case "clickNavbarLink":
      return isClickNavbarLinkDetails(event.details);
    case "ouvrirModaleAjouterPieceJointe":
      return isOpenModalAddPieceJointeDetails(event.details);
    case "ajouterPieceJointe":
      return isAddPieceJointeDetails(event.details);
    case "retourÀLaConformité":
      return typeof event.details.prescription === "string";
    default: {
      const neverType: never = type;
      void neverType;
      console.error(`le type d'événement '${type}' est inconnu`);
      return false;
    }
  }
}
