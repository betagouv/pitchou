import { DossierPhase, DossierNextActionExpectedFrom } from "./API_Pitchou";
import Dossier from "./database/public/Dossier";
import { default as Prescription } from "./database/public/Prescription";

export type DossierSearchEventDetails = {
  filters: {
    followedBy?: {
      selectedCount: number;
      totalCount: number;
      includesSelf: boolean;
    };
    withoutInstructeur?: boolean;
    text?: string;
    phases?: DossierPhase[];
    nextActionExpectedFrom?: Array<DossierNextActionExpectedFrom | "(vide)">;
    activitesPrincipales?: NonNullable<Dossier["main_activite"]>[];
    departements?: string[];
    nouveaute?: boolean;
  };
  resultCount: number;
};

export type EvenementPieceJointeSource =
  | "enteteDossier"
  | "ongletPiecesJointes"
  | "ongletAvis"
  | "ongletControles"
  | "ongletInstruction";

export type EvenementPieceJointeType =
  | "Décision administrative"
  | "Avis expert"
  | "Saisine expert"
  | "Autre";

export type EvenementOpenModalAddPieceJointeDetails = {
  dossierId: number;
  source: EvenementPieceJointeSource;
};

export type EvenementAddPieceJointeDetails = {
  dossierId: number;
  source: EvenementPieceJointeSource;
  typePieceJointe: EvenementPieceJointeType;
  nombreFichiers: number;
};

export type EvenementMetrique =
  | {
      // We consider that a connection corresponds to loading Pitchou and successfully retrieving the caps URLs
      type: "seConnecter";
    }

  // Modification events
  // Follow a dossier
  | { type: "suivreUnDossier"; details: { dossierId: number } }
  // Edit the instruction comment
  | { type: "modifierCommentaireInstruction" }
  // Change the phase of a dossier
  | { type: "changerPhase" }
  // Change the next expected action from
  | { type: "changerProchaineActionAttendueDe" }
  // Add an administrative decision
  | { type: "ajouterDécisionAdministrative" }
  // Edit an administrative decision
  | { type: "modifierDécisionAdministrative" }
  // Delete an administrative decision
  | { type: "supprimerDécisionAdministrative" }
  // Add a prescription
  | { type: "ajouterPrescription" }
  // Edit a prescription
  | { type: "modifierPrescription" }
  // Delete a prescription
  | { type: "supprimerPrescription" }
  // Add a contrôle
  | { type: "ajouterContrôle" }
  // Edit a contrôle
  | { type: "modifierContrôle" }
  // Delete a contrôle
  | { type: "supprimerContrôle" }
  // Add an avis expert
  | { type: "ajouterAvisExpert" }
  // Edit an avis expert
  | { type: "modifierAvisExpert" }
  // Delete an avis expert
  | { type: "supprimerAvisExpert" }
  // Open an attachment-adding modal
  | {
      type: "ouvrirModaleAjouterPieceJointe";
      details: EvenementOpenModalAddPieceJointeDetails;
    }
  // Add an attachment from a modal
  | {
      type: "ajouterPieceJointe";
      details: EvenementAddPieceJointeDetails;
    }
  // Generate a document
  | { type: "générerUnDocument" }

  // Consultation events
  // Use the search and filter feature in the dossier list
  | { type: "rechercherDesDossiers"; details: DossierSearchEventDetails }
  // Display the list of dossiers the user follows
  | { type: "afficherLesDossiersSuivis" }
  // Access the “Projet” tab of a dossier
  | { type: "consulterUnDossier"; details: { dossierId: number } }
  // Download the list of impacted species of a dossier
  | { type: "téléchargerListeÉspècesImpactées"; details: { dossierId: number } }
  // Download the project cartography of a dossier
  | { type: "téléchargerCartographieProjet"; details: { dossierId: number } }

  // For impact
  | { type: "retourÀLaConformité"; details: { prescription: Prescription["id"] } };
