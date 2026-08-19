import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";

export const EVENEMENTS_CONSULTATIONS: EvenementMetrique["type"][] = [
  "rechercherDesDossiers",
  "afficherLesDossiersSuivis",
  "consulterUnDossier",
  "téléchargerListeÉspècesImpactées",
];

export const EVENEMENTS_MODIFICATIONS: EvenementMetrique["type"][] = [
  "suivreUnDossier",
  "assignDossierFollowers",
  "modifierCommentaireInstruction",
  "changerPhase",
  "changerProchaineActionAttendueDe",
  "changerDateProchaineEcheance",
  "ajouterDécisionAdministrative",
  "modifierDécisionAdministrative",
  "supprimerDécisionAdministrative",
  "ajouterPrescription",
  "modifierPrescription",
  "supprimerPrescription",
  "ajouterContrôle",
  "modifierContrôle",
  "supprimerContrôle",
  "ajouterAvisExpert",
  "modifierAvisExpert",
  "supprimerAvisExpert",
  "générerUnDocument",
];
