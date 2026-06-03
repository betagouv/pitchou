import type { ÉvènementMétrique } from "../../../types/évènement.d.ts";

export const ÉVÈNEMENTS_CONSULTATIONS: ÉvènementMétrique["type"][] = [
  "rechercherDesDossiers",
  "afficherLesDossiersSuivis",
  "consulterUnDossier",
  "téléchargerListeÉspècesImpactées",
];

export const ÉVÈNEMENTS_MODIFICATIONS: ÉvènementMétrique["type"][] = [
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
