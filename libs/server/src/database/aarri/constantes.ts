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
  "ajouterDecisionAdministrative",
  "modifierDecisionAdministrative",
  "supprimerDecisionAdministrative",
  "ajouterPrescription",
  "modifierPrescription",
  "supprimerPrescription",
  "ajouterControle",
  "modifierControle",
  "supprimerControle",
  "ajouterAvisExpert",
  "modifierAvisExpert",
  "supprimerAvisExpert",
  "générerUnDocument",
];
