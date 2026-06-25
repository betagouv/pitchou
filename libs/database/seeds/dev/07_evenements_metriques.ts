import type { Knex } from "knex";

import type { ÉvènementMétrique } from "@pitchou/types/évènement.d.ts";
import {
  ÉVÈNEMENTS_CONSULTATIONS,
  ÉVÈNEMENTS_MODIFICATIONS,
} from "@pitchou/server/database/aarri/constantes.ts";

import { SEED_PERSONNES } from "./06_users.ts";

/**
 * Seed creating demo metric events for the AARRI indicators
 *
 * It builds a realistic funnel that grows over time:
 *   Acquis (12) >= Actif (8) >= Retenu (5) >= Impact (3)
 *
 * Activity profiles are mapped to seed personnes by index. Idempotent:
Å * existing metric events for each personne are deleted before re-inserting.
 */

type EventType = ÉvènementMétrique["type"];

type WeekActivity = {
  weeksAgo: number;
  modifications: number;
  consultations: number;
  impact?: boolean;
};

type ActivityProfile = {
  acquisitionWeeksAgo: number;
  activity: WeekActivity[];
};

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

const ACTIVITY_PROFILES: ActivityProfile[] = [
  // — Retenu with impact (sustained activity + retour a la conformite) —
  { acquisitionWeeksAgo: 13, activity: activeWeeks(11, 8, 5, 3, 4) },
  { acquisitionWeeksAgo: 12, activity: activeWeeks(10, 8, 5, 3, 3) },
  { acquisitionWeeksAgo: 11, activity: activeWeeks(9, 8, 6, 4, 2) },
  // — Retenu without impact —
  { acquisitionWeeksAgo: 10, activity: activeWeeks(8, 7, 5, 3) },
  { acquisitionWeeksAgo: 9, activity: activeWeeks(7, 7, 5, 4) },
  // — Actif but not retenu —
  {
    acquisitionWeeksAgo: 7,
    activity: [
      { weeksAgo: 5, modifications: 6, consultations: 2 },
      { weeksAgo: 4, modifications: 6, consultations: 1 },
    ],
  },
  {
    acquisitionWeeksAgo: 6,
    activity: [{ weeksAgo: 3, modifications: 6, consultations: 2 }],
  },
  {
    acquisitionWeeksAgo: 5,
    activity: [
      { weeksAgo: 3, modifications: 5, consultations: 1 },
      { weeksAgo: 2, modifications: 5, consultations: 2 },
    ],
  },
  // — Acquis only (connection + low activity) —
  { acquisitionWeeksAgo: 8, activity: [{ weeksAgo: 7, modifications: 0, consultations: 2 }] },
  { acquisitionWeeksAgo: 4, activity: [] },
  { acquisitionWeeksAgo: 3, activity: [{ weeksAgo: 2, modifications: 1, consultations: 2 }] },
  { acquisitionWeeksAgo: 2, activity: [] },
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

type MetricEventRow = {
  personne: number;
  évènement: EventType;
  détails: Record<string, unknown> | null;
  date: Date;
};

export async function seed(knex: Knex) {
  const currentMonday = mondayOfWeek(new Date());

  function dateInWeek(weeksAgo: number, dayOffset: number): Date {
    const date = new Date(currentMonday);
    date.setDate(date.getDate() - weeksAgo * 7 + (dayOffset % 5));
    return date;
  }

  await knex.transaction(async (transaction) => {
    const rows: MetricEventRow[] = [];
    let processedCount = 0;

    const count = Math.min(ACTIVITY_PROFILES.length, SEED_PERSONNES.length);
    for (let i = 0; i < count; i++) {
      const profile = ACTIVITY_PROFILES[i];
      const seedPerson = SEED_PERSONNES[i];

      const personne = await transaction("personne").where({ email: seedPerson.email }).first();
      if (!personne) continue;

      // Idempotence: remove existing metric events before re-inserting
      await transaction("évènement_métrique").where({ personne: personne.id }).delete();

      rows.push({
        personne: personne.id,
        évènement: "seConnecter",
        détails: null,
        date: dateInWeek(profile.acquisitionWeeksAgo, 0),
      });

      for (const week of profile.activity) {
        for (let j = 0; j < week.modifications; j++) {
          const type = ÉVÈNEMENTS_MODIFICATIONS[j % ÉVÈNEMENTS_MODIFICATIONS.length];
          rows.push({
            personne: personne.id,
            évènement: type,
            détails: detailsFor(type, j),
            date: dateInWeek(week.weeksAgo, j),
          });
        }
        for (let j = 0; j < week.consultations; j++) {
          const type = ÉVÈNEMENTS_CONSULTATIONS[j % ÉVÈNEMENTS_CONSULTATIONS.length];
          rows.push({
            personne: personne.id,
            évènement: type,
            détails: detailsFor(type, j),
            date: dateInWeek(week.weeksAgo, j + 1),
          });
        }
        if (week.impact) {
          rows.push({
            personne: personne.id,
            évènement: "retourÀLaConformité",
            détails: detailsFor("retourÀLaConformité", 0),
            date: dateInWeek(week.weeksAgo, 3),
          });
        }
      }

      processedCount++;
    }

    if (rows.length > 0) {
      await transaction("évènement_métrique").insert(rows);
    }

    console.log("");
    console.log("  Metric events seed OK");
    console.log(`  ${processedCount} personnes`);
    console.log(`  ${rows.length} metric events inserted`);
    console.log("");
  });
}
