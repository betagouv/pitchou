import type { SeedAvisExpert } from "./types.ts";

export const SEED_AVIS_EXPERTS: SeedAvisExpert[] = [
  // D1 – éolien Bretagne – CSRPN Bretagne favorable sous conditions
  {
    id: "ae000001-0000-4000-a000-000000000001",
    dossier: "99000001",
    expert: "CSRPN",
    saisine_date: new Date("2023-01-30"),
    avis: "Favorable sous conditions",
    avis_date: new Date("2023-03-20"),
  },
  // D6 – routier Normandie – CNPN saisi, avis non encore rendu
  {
    id: "ae000002-0000-4000-a000-000000000002",
    dossier: "99000006",
    expert: "CNPN",
    saisine_date: new Date("2024-06-03"),
    avis: null,
    avis_date: null,
  },
  // D10 – aménagement lotissement – CNPN favorable
  {
    id: "ae000003-0000-4000-a000-000000000003",
    dossier: "99000010",
    expert: "CNPN",
    saisine_date: new Date("2026-05-26"),
    avis: "Favorable",
    avis_date: new Date("2026-05-26"),
    nom_fichier_saisine: "saisine-cnpn-lotissement-ploufragan.pdf",
    nom_fichier_avis: "avis-cnpn-lotissement-ploufragan.pdf",
  },
  // D11 – pistes cyclables Rennes-Dinan – CSRPN favorable, avis non daté
  {
    id: "ae000004-0000-4000-a000-000000000004",
    dossier: "99000011",
    expert: "CSRPN",
    saisine_date: new Date("2026-05-05"),
    avis: "Favorable",
    avis_date: null,
    nom_fichier_saisine: "saisine-csrpn-pistes-cyclables-rennes-dinan.pdf",
    nom_fichier_avis: "avis-csrpn-pistes-cyclables-rennes-dinan.pdf",
  },
];
