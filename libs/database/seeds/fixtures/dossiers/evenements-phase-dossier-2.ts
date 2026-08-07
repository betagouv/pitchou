import type { SeedEvenementPhaseDossier } from "./types.ts";

export const SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_2: SeedEvenementPhaseDossier[] = [
  // D9 – hydraulique Guyane → Instruction
  {
    dossier: "99000009",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2024-07-30T15:00:00+00:00"),
    demarche_numerique_agent_email: "audrey.mercier@dgtm-guyane.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000009",
    phase: "Instruction",
    timestamp: new Date("2024-11-20T10:30:00+00:00"),
    demarche_numerique_agent_email: "audrey.mercier@dgtm-guyane.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D11 – pistes cyclables Rennes-Dinan → Instruction → Controle → Accompagnement amont
  {
    dossier: "99000011",
    phase: "Instruction",
    timestamp: new Date("2026-05-05T10:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000011",
    phase: "Contrôle",
    timestamp: new Date("2026-05-05T11:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000011",
    phase: "Accompagnement amont",
    timestamp: new Date("2026-05-05T12:00:00+00:00"),
    demarche_numerique_agent_email: "camille.rousseau@dev.pitchou.fr",
    demarche_numerique_motivation: null,
  },
];
