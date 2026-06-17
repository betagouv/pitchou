import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "../../scripts/types/database/public/Personne.ts";
import type { ÉvènementMétrique } from "../../scripts/types/évènement.d.ts";

/**
 * Seeds a handful of personnes covering every AARRI level (base, acquis, actif,
 * retenu, impact) so the admin page « Utilisateurices et niveau AARRI » has
 * realistic data in dev.
 *
 * Event dates are relative to "now" (whole weeks ago), which keeps them in
 * distinct calendar weeks however the seed is replayed — exactly what the level
 * computation (see scripts/server/database/aarri/niveau.ts) buckets on.
 */

type SeedEvent = {
  type: ÉvènementMétrique["type"];
  /** Whole weeks before now (0 = this week). */
  weeksAgo: number;
  count: number;
};

type SeedUtilisateur = {
  email: string;
  nom: string;
  prénoms: string;
  events: SeedEvent[];
};

// Five mixed consultation/modification actions on a single week: a "validated" week.
function validatedWeek(weeksAgo: number): SeedEvent[] {
  return [
    { type: "consulterUnDossier", weeksAgo, count: 3 },
    { type: "modifierPrescription", weeksAgo, count: 2 },
  ];
}

const SEED_UTILISATEURS: SeedUtilisateur[] = [
  // base : a Pitchou account that has never connected.
  { email: "aarri-base-1@seed.local", nom: "Bernard", prénoms: "Alex", events: [] },
  { email: "aarri-base-2@seed.local", nom: "Petit", prénoms: "Dominique", events: [] },

  // acquis : connected, but not enough activity to be active.
  {
    email: "aarri-acquis-1@seed.local",
    nom: "Durand",
    prénoms: "Camille",
    events: [
      { type: "seConnecter", weeksAgo: 1, count: 1 },
      { type: "consulterUnDossier", weeksAgo: 1, count: 2 },
    ],
  },
  {
    email: "aarri-acquis-2@seed.local",
    nom: "Moreau",
    prénoms: "Sacha",
    events: [{ type: "seConnecter", weeksAgo: 0, count: 1 }],
  },

  // actif : 5+ modifications within a single week.
  {
    email: "aarri-actif-1@seed.local",
    nom: "Lefebvre",
    prénoms: "Manon",
    events: [
      { type: "seConnecter", weeksAgo: 0, count: 1 },
      { type: "modifierPrescription", weeksAgo: 0, count: 5 },
    ],
  },
  {
    email: "aarri-actif-2@seed.local",
    nom: "Garcia",
    prénoms: "Noé",
    events: [
      { type: "seConnecter", weeksAgo: 0, count: 1 },
      { type: "ajouterContrôle", weeksAgo: 0, count: 4 },
      { type: "modifierContrôle", weeksAgo: 0, count: 2 },
      // A few actions another week, but not enough weeks to be retenu.
      { type: "modifierPrescription", weeksAgo: 3, count: 3 },
    ],
  },

  // retenu : 5 validated weeks within an 8-week window.
  {
    email: "aarri-retenu-1@seed.local",
    nom: "Roux",
    prénoms: "Inès",
    events: [
      { type: "seConnecter", weeksAgo: 5, count: 1 },
      ...validatedWeek(0),
      ...validatedWeek(1),
      ...validatedWeek(2),
      ...validatedWeek(4),
      ...validatedWeek(5),
    ],
  },

  // impact : produced at least one return to conformity.
  {
    email: "aarri-impact-1@seed.local",
    nom: "Fontaine",
    prénoms: "Lou",
    events: [
      { type: "seConnecter", weeksAgo: 2, count: 1 },
      { type: "modifierPrescription", weeksAgo: 1, count: 3 },
      { type: "retourÀLaConformité", weeksAgo: 0, count: 1 },
    ],
  },
];

function dateWeeksAgo(weeksAgo: number): Date {
  return new Date(Date.now() - weeksAgo * 7 * 24 * 60 * 60 * 1000);
}

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    for (const seedUtilisateur of SEED_UTILISATEURS) {
      let personne = await transaction("personne").where({ email: seedUtilisateur.email }).first();

      if (!personne) {
        const newPersonne: PersonneInitializer = {
          email: seedUtilisateur.email,
          nom: seedUtilisateur.nom,
          prénoms: seedUtilisateur.prénoms,
          code_accès: randomBytes(16).toString("hex"),
        };
        const [inserted] = await transaction("personne").insert(newPersonne).returning("id");
        personne = inserted;
      } else if (!personne.code_accès) {
        await transaction("personne")
          .where({ id: personne.id })
          .update({ code_accès: randomBytes(16).toString("hex") });
      }

      // Refresh the events so replaying the seed re-dates them to the current weeks.
      await transaction("évènement_métrique").where({ personne: personne.id }).delete();

      const rows = seedUtilisateur.events.flatMap(({ type, weeksAgo, count }) =>
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
    console.log(`  Seed AARRI OK — ${SEED_UTILISATEURS.length} personnes créées`);
    console.log("  Niveaux : 2 base, 2 acquis, 2 actif, 1 retenu, 1 impact");
    console.log(
      "  Pour voir la page /admin/utilisateurs en dev, ajoutez votre email dev à PITCHOU_ADMIN_EMAILS",
    );
    console.log("");
  });
}
