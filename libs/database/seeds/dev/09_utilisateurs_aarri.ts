import type { Knex } from "knex";

import type { ÉvènementMétrique } from "@pitchou/types/évènement.d.ts";

import { SEED_PERSONNES } from "./06_users.ts";


type SeedEvent = {
  type: ÉvènementMétrique["type"];
  weeksAgo: number;
  count: number;
};

type AarriProfile = {
  events: SeedEvent[];
};

function validatedWeek(weeksAgo: number): SeedEvent[] {
  return [
    { type: "consulterUnDossier", weeksAgo, count: 3 },
    { type: "modifierPrescription", weeksAgo, count: 2 },
  ];
}

// 8 profiles mapped to SEED_PERSONNES[12..19]
const AARRI_PROFILES: AarriProfile[] = [
  // base: a Pitchou account that has never connected.
  { events: [] },
  { events: [] },

  // acquis: connected, but not enough activity to be active.
  {
    events: [
      { type: "seConnecter", weeksAgo: 1, count: 1 },
      { type: "consulterUnDossier", weeksAgo: 1, count: 2 },
    ],
  },
  {
    events: [{ type: "seConnecter", weeksAgo: 0, count: 1 }],
  },

  // activé: 5+ modifications within a single week.
  {
    events: [
      { type: "seConnecter", weeksAgo: 0, count: 1 },
      { type: "modifierPrescription", weeksAgo: 0, count: 5 },
    ],
  },
  {
    events: [
      { type: "seConnecter", weeksAgo: 0, count: 1 },
      { type: "ajouterContrôle", weeksAgo: 0, count: 4 },
      { type: "modifierContrôle", weeksAgo: 0, count: 2 },
      { type: "modifierPrescription", weeksAgo: 3, count: 3 },
    ],
  },

  // retenu: 5 validated weeks within an 8-week window.
  {
    events: [
      { type: "seConnecter", weeksAgo: 5, count: 1 },
      ...validatedWeek(0),
      ...validatedWeek(1),
      ...validatedWeek(2),
      ...validatedWeek(4),
      ...validatedWeek(5),
    ],
  },

  // impact: produced at least one return to conformity.
  {
    events: [
      { type: "seConnecter", weeksAgo: 2, count: 1 },
      { type: "modifierPrescription", weeksAgo: 1, count: 3 },
      { type: "retourÀLaConformité", weeksAgo: 0, count: 1 },
    ],
  },
];

// Offset avoids overwriting metric events seeded by 08_evenements_metriques,
// which uses SEED_PERSONNES[0..11] (12 activity profiles).
const AARRI_PROFILES_OFFSET = 12;

function dateWeeksAgo(weeksAgo: number): Date {
  return new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
}

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    for (let i = 0; i < AARRI_PROFILES.length; i++) {
      const profile = AARRI_PROFILES[i];
      const seedPerson = SEED_PERSONNES[AARRI_PROFILES_OFFSET + i];
      if (!seedPerson) continue;

      const personne = await transaction("personne").where({ email: seedPerson.email }).first();
      if (!personne) continue;

      // Idempotence: remove existing metric events before re-inserting
      await transaction("évènement_métrique").where({ personne: personne.id }).delete();

      const rows = profile.events.flatMap(({ type, weeksAgo, count }) =>
        Array.from({ length: count }, () => ({
          personne: personne.id,
          évènement: type,
          date: dateWeeksAgo(weeksAgo),
        })),
      );

      if (rows.length >= 1) {
        await transaction("évènement_métrique").insert(rows);
      }
    }

    console.log("");
    console.log(`  Seed AARRI OK — ${AARRI_PROFILES.length} personnes`);
    console.log("  Niveaux : 2 base, 2 acquis, 2 activé, 1 retenu, 1 impact");
    console.log(
      "  Pour voir la page /admin/utilisateurs en dev, ajoutez votre email dev à PITCHOU_ADMIN_EMAILS",
    );
    console.log("");
  });
}
