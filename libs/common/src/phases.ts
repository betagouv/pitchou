import type {
  DossierPhase,
  DossierProchaineActionAttenduePar,
} from "@pitchou/types/API_Pitchou.ts";

export const phases: Set<DossierPhase> = new Set([
  "Accompagnement amont",
  "Étude recevabilité DDEP",
  "Instruction",
  "Controle",
  "Classé sans suite",
  "Obligations terminées",
]);

export const prochaineActionAttenduePar: Set<DossierProchaineActionAttenduePar> = new Set([
  "Instructeur",
  "CNPN/CSRPN",
  "Pétitionnaire",
  "Consultation du public",
  "Autre administration",
  "Autre",
  "Personne",
]);
