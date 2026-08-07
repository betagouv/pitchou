import type { SeedControle } from "./types.ts";

export const SEED_CONTROLES_CHUNK_1: SeedControle[] = [
  // --- D1 prescriptions (a0000001–a0000004) ---

  {
    id: "c0000001-0000-4000-a000-000000000001",
    prescription: "a0000001-0000-4000-a000-000000000001",
    controle_date: new Date("2024-12-10T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "Protocole de suivi chiroptères mis en œuvre dès la mise en service. Premier rapport annuel transmis le 28/11/2024, conforme aux prescriptions.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2025-12-10"),
  },
  {
    id: "c0000002-0000-4000-a000-000000000002",
    prescription: "a0000002-0000-4000-a000-000000000002",
    controle_date: new Date("2024-07-18T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Le système de bridage présente des dysfonctionnements sur 2 éoliennes (E2 et E4) depuis juin 2024. Exploitant informé par mail.",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2024-07-18"),
    next_due_date: new Date("2024-10-15"),
  },
  {
    id: "c0000003-0000-4000-a000-000000000003",
    prescription: "a0000004-0000-4000-a000-000000000004",
    controle_date: new Date("2024-03-25T00:00:00+00:00"),
    result: "Conforme",
    comment: "Balisage en place sur les 3 haies identifiées. Exclos correctement matérialisés.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: null,
  },
  // --- D3 prescriptions (a0000005–a0000007) ---

  {
    id: "c0000004-0000-4000-a000-000000000004",
    prescription: "a0000006-0000-4000-a000-000000000006",
    controle_date: new Date("2025-04-22T00:00:00+00:00"),
    result: "Conforme",
    comment: "4 nids artificiels posés en béton bois, bien orientés, à 4,2 m de hauteur.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2026-04-30"),
  },
  {
    id: "c0000005-0000-4000-a000-000000000005",
    prescription: "a0000007-0000-4000-a000-000000000007",
    controle_date: new Date("2025-09-15T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Compte-rendu de suivi 2025 non transmis à la date attendue (31/07/2025). Relance adressée.",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2025-09-15"),
    next_due_date: new Date("2025-10-31"),
  },
  // --- D8 prescriptions (a0000008–a0000010) ---

  {
    id: "c0000006-0000-4000-a000-000000000006",
    prescription: "a0000008-0000-4000-a000-000000000008",
    controle_date: new Date("2024-02-07T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "Démontage du nid réalisé le 31/01/2024 en présence de Mme Hélène Gardet (écologue). Aucun individu présent lors de l'opération.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: null,
  },
  {
    id: "c0000007-0000-4000-a000-000000000007",
    prescription: "a0000009-0000-4000-a000-000000000009",
    controle_date: new Date("2024-03-12T00:00:00+00:00"),
    result: "Conforme",
    comment:
      "2 plateformes installées le 22/02/2024 sur mâts télescopiques à 7 m de hauteur. Photos transmises.",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: new Date("2025-05-31"),
  },
  {
    id: "c0000008-0000-4000-a000-000000000008",
    prescription: "a0000010-0000-4000-a000-000000000010",
    controle_date: new Date("2025-07-14T00:00:00+00:00"),
    result: "Non conforme",
    comment:
      "Rapport de suivi 2024 non transmis malgré relance. Aucun couple nicheur observé sur les 2 plateformes en 2024 (probablement dû à la perturbation des travaux adjacents).",
    post_controle_action_type: "Email",
    post_controle_action_date: new Date("2025-07-14"),
    next_due_date: new Date("2025-09-30"),
  },
  // --- D10 prescription (a0000011) ---

  {
    id: "c0000009-0000-4000-a000-000000000009",
    prescription: "a0000011-0000-4000-a000-000000000011",
    controle_date: new Date("2036-05-26T00:00:00+00:00"),
    result: "Non conforme",
    comment: "c'est pas bien il n'y a pas de mare",
    post_controle_action_type: "rappel qu'il faut en faire une",
    post_controle_action_date: new Date("2036-11-26"),
    next_due_date: new Date("2045-05-26"),
  },
];
