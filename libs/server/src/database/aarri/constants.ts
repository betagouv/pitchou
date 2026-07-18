import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";

export const EVENEMENTS_CONSULTATIONS: EvenementMetrique["type"][] = [
  "rechercherDesDossiers",
  "afficherLesDossiersSuivis",
  "consulterUnDossier",
  "téléchargerListeÉspècesImpactées",
];

export const EVENEMENTS_MODIFICATIONS: EvenementMetrique["type"][] = [
  "suivreUnDossier",
  "modifierCommentaireInstruction",
  "changerPhase",
  "changerProchaineActionAttendueDe",
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
