import { startOfWeek, eachWeekOfInterval } from "date-fns";

import { ÉVÈNEMENTS_CONSULTATIONS, ÉVÈNEMENTS_MODIFICATIONS } from "./constantes.ts";

import type { NiveauAARRI } from "@pitchou/types/API_Pitchou.ts";
import type { ÉvènementMétrique } from "@pitchou/types/évènement.d.ts";

/**
 * Pure (database-free) logic that computes the AARRI level of a single personne
 * from their list of metric events. The thresholds match the aggregate
 * indicators in `aarri.ts` so the admin page stays consistent with the public
 * stats funnel (calendar weeks, "5 validated weeks within an 8-week window" for
 * retention).
 */

/** A metric event reduced to what the level computation needs. */
export type LevelEvent = {
  type: ÉvènementMétrique["type"];
  date: Date;
};

/** AARRI levels from the lowest to the highest funnel stage. */
export const NIVEAUX_AARRI: NiveauAARRI[] = ["base", "acquis", "actif", "retenu", "impact"];

/** Rank of a level within the funnel (higher = further down the funnel). */
export function niveauAARRIRank(niveau: NiveauAARRI): number {
  return NIVEAUX_AARRI.indexOf(niveau);
}

// Thresholds, kept identical to the aggregate indicators (see aarri.ts).
export const ACTIONS_PER_WEEK_FOR_ACTIF = 5;
export const ACTIONS_PER_WEEK_FOR_RETENU = 5;
export const RETENU_SLIDING_WINDOW_WEEKS = 8;
export const VALIDATED_WEEKS_FOR_RETENU = 5;

/** ISO string of the Monday starting a calendar week — used as a week key. */
type WeekKey = string;

const MODIFICATION_TYPES = new Set<ÉvènementMétrique["type"]>(ÉVÈNEMENTS_MODIFICATIONS);
const RETENU_TYPES = new Set<ÉvènementMétrique["type"]>([
  ...ÉVÈNEMENTS_CONSULTATIONS,
  ...ÉVÈNEMENTS_MODIFICATIONS,
]);

function weekKey(date: Date): WeekKey {
  return startOfWeek(date, { weekStartsOn: 1 }).toISOString();
}

/** Counts events whose type is in `types`, grouped by calendar week (Monday). */
export function countActionsPerWeek(
  events: LevelEvent[],
  types: Set<ÉvènementMétrique["type"]>,
): Map<WeekKey, number> {
  const counts = new Map<WeekKey, number>();
  for (const { type, date } of events) {
    if (!types.has(type)) continue;
    const key = weekKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * The consecutive calendar weeks (Monday keys) spanning the earliest to the
 * latest event. Empty weeks in between are included so the retention sliding
 * window can run over a continuous timeline.
 */
function consecutiveWeeks(events: LevelEvent[]): WeekKey[] {
  if (events.length === 0) return [];
  let min = events[0].date;
  let max = events[0].date;
  for (const { date } of events) {
    if (date < min) min = date;
    if (date > max) max = date;
  }
  return eachWeekOfInterval({ start: min, end: max }, { weekStartsOn: 1 }).map((d) =>
    d.toISOString(),
  );
}

/**
 * The first week at which the personne becomes "retenu", or null if they never
 * are. Retention condition: there is a `slidingWindowWeeks`-week window
 * containing at least `validatedWeeksThreshold` validated weeks. A week is
 * validated when it holds at least `actionsPerWeekThreshold` actions.
 *
 * This is the single source of truth shared with the aggregate indicator in
 * aarri.ts.
 */
export function getFirstRetenuWeek(
  actionsPerWeek: Map<WeekKey, number>,
  actionsPerWeekThreshold: number,
  slidingWindowWeeks: number,
  weeks: WeekKey[],
  validatedWeeksThreshold: number,
): WeekKey | null {
  for (let i = 0; i <= weeks.length; i++) {
    const window = weeks.slice(i, i + slidingWindowWeeks);
    const validatedWeeks = window.filter((week) => {
      return (actionsPerWeek.get(week) ?? 0) >= actionsPerWeekThreshold;
    });
    if (validatedWeeks.length >= validatedWeeksThreshold) {
      return validatedWeeks.at(-1) ?? null;
    }
  }
  return null;
}

/** True if the personne has connected at least once. */
export function isAcquis(events: LevelEvent[]): boolean {
  return events.some((event) => event.type === "seConnecter");
}

/** True if the personne made ≥5 modification actions within a single calendar week. */
export function isActif(events: LevelEvent[]): boolean {
  const actionsPerWeek = countActionsPerWeek(events, MODIFICATION_TYPES);
  for (const count of actionsPerWeek.values()) {
    if (count >= ACTIONS_PER_WEEK_FOR_ACTIF) return true;
  }
  return false;
}

/** True if the personne validated ≥5 weeks within an 8-week sliding window. */
export function isRetenu(events: LevelEvent[]): boolean {
  const actionsPerWeek = countActionsPerWeek(events, RETENU_TYPES);
  const weeks = consecutiveWeeks(events.filter((event) => RETENU_TYPES.has(event.type)));
  return (
    getFirstRetenuWeek(
      actionsPerWeek,
      ACTIONS_PER_WEEK_FOR_RETENU,
      RETENU_SLIDING_WINDOW_WEEKS,
      weeks,
      VALIDATED_WEEKS_FOR_RETENU,
    ) !== null
  );
}

/** True if the personne produced at least one "retour à la conformité". */
export function hasImpact(events: LevelEvent[]): boolean {
  return events.some((event) => event.type === "retourÀLaConformité");
}

/**
 * The highest AARRI level reached by the personne given their events. Levels are
 * evaluated independently (like the aggregate indicators) and the highest one
 * wins, so impact > retenu > actif > acquis > base.
 */
export function computeNiveauAARRI(events: LevelEvent[]): NiveauAARRI {
  if (hasImpact(events)) return "impact";
  if (isRetenu(events)) return "retenu";
  if (isActif(events)) return "actif";
  if (isAcquis(events)) return "acquis";
  return "base";
}
