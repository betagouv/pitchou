import type { SeedEspecesImpactees } from "./types.ts";

export const SEED_ESPECES_IMPACTEES: SeedEspecesImpactees[] = [
  // D10 — Aménagement de lotissement
  // Hirondelle rousseline (CNPN, oiseau) impacted twice; Grenouille des champs
  // (ministérielle, faune non-oiseau) impacted once.
  {
    dossier: "99000010",
    nom_fichier: "especes-impactees.ods",
    lignes: [
      // Dégradation/destruction d'aires de repos/reproduction (P-4-2)
      {
        classification: "oiseau",
        cd_ref: "459478",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 4000,
      },
      // Destruction de nids/oeufs (P-4-1)
      {
        classification: "oiseau",
        cd_ref: "459478",
        identifiant_pitchou_activité: "P-4-1",
        nombre_nids: 12,
      },
      // Dégradation/destruction d'aires de repos/reproduction, faune non-oiseau (P-60)
      {
        classification: "faune non-oiseau",
        cd_ref: "299",
        identifiant_pitchou_activité: "P-60",
        surface_habitat_détruit: 2000,
      },
    ],
  },
  // D11 — Agrandissement pistes cyclables Rennes-Dinan
  {
    dossier: "99000011",
    nom_fichier: "especes-impactees.ods",
    lignes: [
      // Dégradation/destruction d'aires de repos/reproduction, oiseau (P-4-2)
      {
        classification: "oiseau",
        cd_ref: "4663",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      {
        classification: "oiseau",
        cd_ref: "4669",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      {
        classification: "oiseau",
        cd_ref: "2666",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 1200,
      },
      {
        classification: "oiseau",
        cd_ref: "4221",
        identifiant_pitchou_activité: "P-4-2",
        surface_habitat_détruit: 3000,
      },
      // Dégradation/destruction d'aires de repos/reproduction, faune non-oiseau (P-60)
      {
        classification: "faune non-oiseau",
        cd_ref: "351",
        identifiant_pitchou_activité: "P-60",
        surface_habitat_détruit: 450,
      },
      // Capture/relâcher immédiat, faune non-oiseau (P-30)
      {
        classification: "faune non-oiseau",
        cd_ref: "351",
        identifiant_pitchou_activité: "P-30",
        nombre_individus: "11-100",
      },
      // Peturbation, effarouchement, faune non-oiseau (P-40)
      {
        classification: "faune non-oiseau",
        cd_ref: "77600",
        identifiant_pitchou_activité: "P-40",
        nombre_individus: "0-10",
      },
      // Cueillette, collecte, coupe, déracinement…, flore (P-80)
      {
        classification: "flore",
        cd_ref: "88560",
        identifiant_pitchou_activité: "P-80",
        surface_habitat_détruit: 3500,
      },
    ],
  },
];
