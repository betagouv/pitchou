import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "../../scripts/types/database/public/Personne.ts";
import type { ÉvènementMétrique } from "../../scripts/types/évènement.d.ts";
import {
  ÉVÈNEMENTS_CONSULTATIONS,
  ÉVÈNEMENTS_MODIFICATIONS,
} from "../../scripts/server/database/aarri/constantes.ts";

/**
 * Seed creating demo metric events for the AARRI indicators
 *
 * It builds a realistic funnel that grows over time:
 *   Acquis (12) >= Actif (8) >= Retenu (5) >= Impact (3)
 *
 * Demo personnes use the `@demo.pitchou.local` domain (so NOT `@beta.gouv.fr`,
 * otherwise they would be excluded from the indicators). The seed is
 * idempotent: existing demo personnes are deleted first (the cascade also
 * removes their metric events).
 */

const DEMO_DOMAIN = "demo.pitchou.local";

type EventType = ÉvènementMétrique["type"];

/** A personne's activity over a single week. */
type WeekActivity = {
  /** Number of weeks before today (0 = current week). */
  weeksAgo: number;
  /** Number of modification actions that week. */
  modifications: number;
  /** Number of consultation actions that week. */
  consultations: number;
  /** When true, adds a "retour a la conformite" event (impact). */
  impact?: boolean;
};

type DemoPersonne = {
  firstName: string;
  lastName: string;
  emailLocal: string;
  /** Week of the first connection, in weeks before today. */
  acquisitionWeeksAgo: number;
  activity: WeekActivity[];
};

/**
 * Builds a run of consecutive active weeks.
 * @param start oldest week (in weeks before today)
 * @param count number of consecutive weeks
 * @param impactWeek week (in weeks before today) on which to place an impact
 */
function activeWeeks(
  start: number,
  count: number,
  modifications: number,
  consultations: number,
  impactWeek?: number,
): WeekActivity[] {
  const weeks: WeekActivity[] = [];
  for (let i = 0; i < count; i++) {
    const weeksAgo = start - i;
    weeks.push({
      weeksAgo,
      modifications,
      consultations,
      impact: weeksAgo === impactWeek,
    });
  }
  return weeks;
}

const DEMO_PERSONNES: DemoPersonne[] = [
  // — Retenu with impact (sustained activity + retour a la conformite) —
  {
    firstName: "Camille",
    lastName: "Roussel",
    emailLocal: "camille.roussel",
    acquisitionWeeksAgo: 13,
    activity: activeWeeks(11, 8, 5, 3, 4),
  },
  {
    firstName: "Aïcha",
    lastName: "Benali",
    emailLocal: "aicha.benali",
    acquisitionWeeksAgo: 12,
    activity: activeWeeks(10, 8, 5, 3, 3),
  },
  {
    firstName: "Thomas",
    lastName: "Lefevre",
    emailLocal: "thomas.lefevre",
    acquisitionWeeksAgo: 11,
    activity: activeWeeks(9, 8, 6, 4, 2),
  },
  // — Retenu without impact —
  {
    firstName: "Marie",
    lastName: "Dubois",
    emailLocal: "marie.dubois",
    acquisitionWeeksAgo: 10,
    activity: activeWeeks(8, 7, 5, 3),
  },
  {
    firstName: "Lucas",
    lastName: "Moreau",
    emailLocal: "lucas.moreau",
    acquisitionWeeksAgo: 9,
    activity: activeWeeks(7, 7, 5, 4),
  },
  // — Actif but not retenu (a few weeks with >=5 modifications) —
  {
    firstName: "Fatou",
    lastName: "Diallo",
    emailLocal: "fatou.diallo",
    acquisitionWeeksAgo: 7,
    activity: [
      { weeksAgo: 5, modifications: 6, consultations: 2 },
      { weeksAgo: 4, modifications: 6, consultations: 1 },
    ],
  },
  {
    firstName: "Pierre",
    lastName: "Garnier",
    emailLocal: "pierre.garnier",
    acquisitionWeeksAgo: 6,
    activity: [{ weeksAgo: 3, modifications: 6, consultations: 2 }],
  },
  {
    firstName: "Sophie",
    lastName: "Marchand",
    emailLocal: "sophie.marchand",
    acquisitionWeeksAgo: 5,
    activity: [
      { weeksAgo: 3, modifications: 5, consultations: 1 },
      { weeksAgo: 2, modifications: 5, consultations: 2 },
    ],
  },
  // — Acquis only (connection + low activity) —
  {
    firstName: "Hugo",
    lastName: "Bernard",
    emailLocal: "hugo.bernard",
    acquisitionWeeksAgo: 8,
    activity: [{ weeksAgo: 7, modifications: 0, consultations: 2 }],
  },
  {
    firstName: "Léa",
    lastName: "Fontaine",
    emailLocal: "lea.fontaine",
    acquisitionWeeksAgo: 4,
    activity: [],
  },
  {
    firstName: "Yanis",
    lastName: "Khelifi",
    emailLocal: "yanis.khelifi",
    acquisitionWeeksAgo: 3,
    activity: [{ weeksAgo: 2, modifications: 1, consultations: 2 }],
  },
  {
    firstName: "Claire",
    lastName: "Petit",
    emailLocal: "claire.petit",
    acquisitionWeeksAgo: 2,
    activity: [],
  },
];

/** Monday (noon) of the week containing `date`. */
function mondayOfWeek(date: Date): Date {
  const monday = new Date(date);
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(12, 0, 0, 0);
  return monday;
}

/** Plausible details for the event types that expect them. */
function detailsFor(type: EventType, i: number): Record<string, unknown> | null {
  switch (type) {
    case "suivreUnDossier":
    case "consulterUnDossier":
    case "téléchargerListeÉspècesImpactées":
      return { dossierId: 999000001 + (i % 3) };
    case "rechercherDesDossiers":
      return { filtres: {}, nombreRésultats: (i % 7) + 1 };
    case "retourÀLaConformité":
      return { prescription: 1000 + i };
    default:
      return null;
  }
}

/** One row to insert into the `évènement_métrique` table. */
type MetricEventRow = {
  personne: number;
  évènement: EventType;
  détails: Record<string, unknown> | null;
  date: Date;
};

export async function seed(knex: Knex) {
  const currentMonday = mondayOfWeek(new Date());

  /** A date (offset within the week) `weeksAgo` weeks before the current week. */
  function dateInWeek(weeksAgo: number, dayOffset: number): Date {
    const date = new Date(currentMonday);
    date.setDate(date.getDate() - weeksAgo * 7 + (dayOffset % 5));
    return date;
  }

  await knex.transaction(async (transaction) => {
    // Idempotence: start from a clean slate for demo personnes. The
    // ON DELETE CASCADE constraint also removes their metric events.
    await transaction("personne").where("email", "ilike", `%@${DEMO_DOMAIN}`).delete();

    const rows: MetricEventRow[] = [];

    for (const demo of DEMO_PERSONNES) {
      const newPersonne: PersonneInitializer = {
        email: `${demo.emailLocal}@${DEMO_DOMAIN}`,
        nom: demo.lastName,
        prénoms: demo.firstName,
        code_accès: randomBytes(16).toString("hex"),
      };
      const [inserted] = await transaction("personne").insert(newPersonne).returning(["id"]);
      const personneId: number = inserted.id;

      // First connection → "Acquis" indicator
      rows.push({
        personne: personneId,
        évènement: "seConnecter",
        détails: null,
        date: dateInWeek(demo.acquisitionWeeksAgo, 0),
      });

      for (const week of demo.activity) {
        for (let i = 0; i < week.modifications; i++) {
          const type = ÉVÈNEMENTS_MODIFICATIONS[i % ÉVÈNEMENTS_MODIFICATIONS.length];
          rows.push({
            personne: personneId,
            évènement: type,
            détails: detailsFor(type, i),
            date: dateInWeek(week.weeksAgo, i),
          });
        }
        for (let i = 0; i < week.consultations; i++) {
          const type = ÉVÈNEMENTS_CONSULTATIONS[i % ÉVÈNEMENTS_CONSULTATIONS.length];
          rows.push({
            personne: personneId,
            évènement: type,
            détails: detailsFor(type, i),
            date: dateInWeek(week.weeksAgo, i + 1),
          });
        }
        if (week.impact) {
          rows.push({
            personne: personneId,
            évènement: "retourÀLaConformité",
            détails: detailsFor("retourÀLaConformité", 0),
            date: dateInWeek(week.weeksAgo, 3),
          });
        }
      }
    }

    await transaction("évènement_métrique").insert(rows);

    console.log("");
    console.log("  Metric events seed OK");
    console.log(`  ${DEMO_PERSONNES.length} demo personnes (@${DEMO_DOMAIN})`);
    console.log(`  ${rows.length} metric events inserted`);
    console.log("");
  });
}
