import { DossierPhase, DossierNextActionExpectedFrom } from "./API_Pitchou";
import Dossier from "./database/public/Dossier";
import { default as Prescription } from "./database/public/Prescription";

export type EvenementRechercheDossiersDetails = {
  filtres: {
    suiviPar?: {
      nombreSéléctionnées: number;
      nombreTotal: number;
      inclusSoiMême: boolean;
    };
    sansInstructeurice?: boolean;
    texte?: string;
    phases?: DossierPhase[];
    prochaineActionAttenduePar?: Array<DossierNextActionExpectedFrom | "(vide)">;
    activitésPrincipales?: NonNullable<Dossier["main_activite"]>[];
    nouveauté?: boolean;
  };
  nombreRésultats: number;
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

export type EvenementOuvrirModaleAjouterPieceJointeDetails = {
  dossierId: number;
  source: EvenementPieceJointeSource;
};

export type EvenementAjouterPieceJointeDetails = {
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
  | { type: "suivreUnDossier"; détails: { dossierId: number } }
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
      détails: EvenementOuvrirModaleAjouterPieceJointeDetails;
    }
  // Add an attachment from a modal
  | {
      type: "ajouterPieceJointe";
      détails: EvenementAjouterPieceJointeDetails;
    }
  // Generate a document
  | { type: "générerUnDocument" }

  // Consultation events
  // Use the search and filter feature in the dossier list
  | { type: "rechercherDesDossiers"; détails: EvenementRechercheDossiersDetails }
  // Display the list of dossiers the user follows
  | { type: "afficherLesDossiersSuivis" }
  // Access the “Projet” tab of a dossier
  | { type: "consulterUnDossier"; détails: { dossierId: number } }
  // Download the list of impacted species of a dossier
  | { type: "téléchargerListeÉspècesImpactées"; détails: { dossierId: number } }
  // Download the project cartography of a dossier
  | { type: "téléchargerCartographieProjet"; détails: { dossierId: number } }

  // For impact
  | { type: "retourÀLaConformité"; détails: { prescription: Prescription["id"] } };
