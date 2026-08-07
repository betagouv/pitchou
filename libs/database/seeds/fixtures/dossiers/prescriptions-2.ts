import type { SeedPrescription } from "./types.ts";

export const SEED_PRESCRIPTIONS_CHUNK_2: SeedPrescription[] = [
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
