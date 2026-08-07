import type { SeedPrescription } from "./types.ts";

export const SEED_PRESCRIPTIONS: SeedPrescription[] = [
  // --- D1 (da000001) — éolien Bretagne ---

  {
    id: "a0000001-0000-4000-a000-000000000001",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-05-31"),
    article_number: "Article 4",
    description:
      "Mise en place d'un protocole de suivi de la mortalité par les chiroptères (passage mensuel d'avril à octobre) pendant 3 ans consécutifs à la mise en service.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000002-0000-4000-a000-000000000002",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-09-30"),
    article_number: "Article 5",
    description:
      "Bridage nocturne des 5 éoliennes d'avril à octobre entre le coucher et le lever du soleil, dès lors que la température est supérieure à 10°C et la vitesse du vent inférieure à 6 m/s.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000003-0000-4000-a000-000000000003",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2025-03-31"),
    article_number: "Article 6",
    description:
      "Transmission du rapport annuel de suivi chiroptères et avifaune à la DREAL Bretagne, incluant les données brutes de détection acoustique.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000004-0000-4000-a000-000000000004",
    decision_administrative: "da000001-0000-4000-a000-000000000001",
    due_date: new Date("2024-03-01"),
    article_number: "Article 7",
    description:
      "Balisage des 3 haies bocagères identifiées comme corridors à chiroptères dans l'emprise chantier, avec mise en exclos sur 5 m de part et d'autre.",
    avoided_surface: 3000,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  // --- D3 (da000002) — hirondelle Grand Est ---

  {
    id: "a0000005-0000-4000-a000-000000000005",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: new Date("2025-02-28"),
    article_number: null,
    description:
      "Travaux de ravalement réalisés entre le 16/09/2024 et le 28/02/2025, en dehors de la période de reproduction de l'Hirondelle de fenêtre (mars–août).",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000006-0000-4000-a000-000000000006",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: new Date("2025-04-01"),
    article_number: null,
    description:
      "Pose de 4 nids artificiels en béton bois de type double-nid sur la façade rénovée, à une hauteur minimale de 4 mètres, avant le retour des hirondelles au printemps.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: 4,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000007-0000-4000-a000-000000000007",
    decision_administrative: "da000002-0000-4000-a000-000000000002",
    due_date: null,
    article_number: null,
    description:
      "Suivi annuel de l'occupation des nids artificiels pendant 3 années consécutives (2025, 2026, 2027) avec transmission d'un compte-rendu illustré à la DREAL Grand Est.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  // --- D8 (da000003) — cigogne IDF ---

  {
    id: "a0000008-0000-4000-a000-000000000008",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: new Date("2024-02-01"),
    article_number: "Article 3",
    description:
      "Démontage du nid de Cigogne blanche en dehors de la saison de reproduction (avant le 1er février 2024), en présence d'un écologue mandaté.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000009-0000-4000-a000-000000000009",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: new Date("2024-03-01"),
    article_number: "Article 3",
    description:
      "Installation de 2 plateformes métalliques de nidification (diamètre 80 cm) sur des supports adaptés à proximité immédiate du clocher, avant le retour des cigognes.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: 2,
    avoided_individus: null,
    compensated_individus: null,
  },
  {
    id: "a0000010-0000-4000-a000-000000000010",
    decision_administrative: "da000003-0000-4000-a000-000000000003",
    due_date: null,
    article_number: "Article 4",
    description:
      "Suivi de l'occupation des plateformes de nidification pendant 3 ans (2024, 2025, 2026) avec transmission d'un rapport annuel à la DRIAT IDF précisant le nombre de couples nicheurs et le succès reproducteur.",
    avoided_surface: null,
    compensated_surface: null,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
  // --- D10 (da000004) — aménagement lotissement ---

  {
    id: "a0000011-0000-4000-a000-000000000011",
    decision_administrative: "da000004-0000-4000-a000-000000000004",
    due_date: new Date("2076-05-26"),
    article_number: "1",
    description: "refaire des mares",
    avoided_surface: null,
    compensated_surface: 1500,
    avoided_nids: null,
    compensated_nids: null,
    avoided_individus: null,
    compensated_individus: null,
  },
];
