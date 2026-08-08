import type { SeedDecisionAdministrative } from "./types.ts";

export const SEED_DECISIONS_ADMINISTRATIVES: SeedDecisionAdministrative[] = [
  // D1 – éolien Bretagne – arrêté dérogation préfectoral
  {
    id: "da000001-0000-4000-a000-000000000001",
    dossier: "99000001",
    number: "29-2023-142",
    type: "Arrêté dérogation",
    signature_date: new Date("2023-07-12"),
    obligations_end_date: new Date("2027-12-31"),
  },
  // D3 – hirondelle Grand Est – courrier préfectoral
  {
    id: "da000002-0000-4000-a000-000000000002",
    dossier: "99000003",
    number: null,
    type: "Courrier",
    signature_date: new Date("2024-09-18"),
    obligations_end_date: new Date("2028-04-30"),
  },
  // D8 – cigogne IDF – arrêté dérogation
  {
    id: "da000003-0000-4000-a000-000000000003",
    dossier: "99000008",
    number: "77-2024-008",
    type: "Arrêté dérogation",
    signature_date: new Date("2024-01-20"),
    obligations_end_date: new Date("2027-10-31"),
  },
  // D10 – aménagement lotissement – arrêté dérogation
  {
    id: "da000004-0000-4000-a000-000000000004",
    dossier: "99000010",
    number: "987654321",
    type: "Arrêté dérogation",
    signature_date: new Date("2026-05-26"),
    obligations_end_date: new Date("2076-05-26"),
    nom_fichier: "arrete-derogation-987654321.pdf",
  },
  // D11 – pistes cyclables Rennes-Dinan – arrêté dérogation (sans prescription)
  {
    id: "da000005-0000-4000-a000-000000000005",
    dossier: "99000011",
    number: "987654",
    type: "Arrêté dérogation",
    signature_date: new Date("2026-05-05"),
    obligations_end_date: new Date("2028-08-31"),
    nom_fichier: "arrete-derogation-987654.pdf",
  },
];
