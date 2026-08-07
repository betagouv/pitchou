import type { SeedEvenementPhaseDossier } from "./types.ts";

export const SEED_EVENEMENTS_PHASE_DOSSIER_CHUNK_1: SeedEvenementPhaseDossier[] = [
  // D1 – éolien Bretagne → Controle
  {
    dossier: "99000001",
    phase: "Accompagnement amont",
    timestamp: new Date("2022-09-14T08:30:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-01-16T09:00:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Instruction",
    timestamp: new Date("2023-03-27T10:00:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000001",
    phase: "Contrôle",
    timestamp: new Date("2023-07-12T14:30:00+00:00"),
    demarche_numerique_agent_email: "claire.morin@dreal-bretagne.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D2 – photovoltaïque Occitanie → Instruction
  {
    dossier: "99000002",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2024-03-18T10:15:00+00:00"),
    demarche_numerique_agent_email: "jp.moreau@dreal-oc.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000002",
    phase: "Instruction",
    timestamp: new Date("2024-10-07T09:30:00+00:00"),
    demarche_numerique_agent_email: "jp.moreau@dreal-oc.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D3 – hirondelle Grand Est → Controle
  {
    dossier: "99000003",
    phase: "Instruction",
    timestamp: new Date("2024-06-03T07:55:00+00:00"),
    demarche_numerique_agent_email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000003",
    phase: "Contrôle",
    timestamp: new Date("2024-09-18T11:00:00+00:00"),
    demarche_numerique_agent_email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D4 – chiroptères ARA → Instruction
  {
    dossier: "99000004",
    phase: "Instruction",
    timestamp: new Date("2024-11-07T14:20:00+00:00"),
    demarche_numerique_agent_email: "thomas.girard@dreal-ara.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D5 – centre soins PDL → Accompagnement amont
  {
    dossier: "99000005",
    phase: "Accompagnement amont",
    timestamp: new Date("2025-02-10T09:05:00+00:00"),
    demarche_numerique_agent_email: "stephane.richard@dreal-pdl.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D6 – routier Normandie → Instruction
  {
    dossier: "99000006",
    phase: "Accompagnement amont",
    timestamp: new Date("2023-05-22T13:45:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000006",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-09-11T10:00:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000006",
    phase: "Instruction",
    timestamp: new Date("2024-03-04T09:00:00+00:00"),
    demarche_numerique_agent_email: "elodie.bernard@dreal-normandie.gouv.fr",
    demarche_numerique_motivation: null,
  },
  // D7 – carrière BFC → Classé sans suite
  {
    dossier: "99000007",
    phase: "Étude recevabilité DDEP",
    timestamp: new Date("2023-11-28T11:10:00+00:00"),
    demarche_numerique_agent_email: "aurelie.simon@dreal-bfc.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000007",
    phase: "Classé sans suite",
    timestamp: new Date("2024-11-15T10:00:00+00:00"),
    demarche_numerique_agent_email: "aurelie.simon@dreal-bfc.gouv.fr",
    demarche_numerique_motivation:
      "Dossier incomplet. Sans réponse du pétitionnaire après deux relances.",
  },
  // D8 – cigogne IDF → Controle
  {
    dossier: "99000008",
    phase: "Instruction",
    timestamp: new Date("2023-09-11T08:40:00+00:00"),
    demarche_numerique_agent_email: "nicolas.martin@driat-idf.gouv.fr",
    demarche_numerique_motivation: null,
  },
  {
    dossier: "99000008",
    phase: "Contrôle",
    timestamp: new Date("2024-01-22T09:00:00+00:00"),
    demarche_numerique_agent_email: "nicolas.martin@driat-idf.gouv.fr",
    demarche_numerique_motivation: null,
  },
];
