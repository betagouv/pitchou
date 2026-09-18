import { differenceInDays, format, formatRelative } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formats a JavaScript date according to a given format, using the French locale.
 *
 * If the date is `null` or `undefined`, the function returns the string "(date inconnue)".
 * By default, the requested format is: 'd MMMM yyyy'
 */
/**
 * Pitchou only started recording the time of day of its events in September 2026:
 * everything older was stored as a day and reads as midnight. Displaying « à 00:00 »
 * for all of it would be inventing a precision that was never captured.
 */
const TIME_RECORDED_SINCE = new Date("2026-09-01T00:00:00Z");

/**
 * Whether the time of day of an event is real, or an artefact of a date that was
 * stored without one. A day-only value landed on midnight — in UTC or in the local
 * zone depending on how the database was configured, so both are checked.
 */
export function isTimeOfDayKnown(date: Date | string | undefined | null): boolean {
  if (!date) return false;
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return false;
  if (value >= TIME_RECORDED_SINCE) return true;

  const atUtcMidnight =
    value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0;
  const atLocalMidnight =
    value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0;
  return !atUtcMidnight && !atLocalMidnight;
}

export function formatDateAbsolute(
  date: Date | string | undefined | null,
  requestedFormat: string = "d MMMM yyyy",
): string {
  if (!date) {
    return "(date inconnue)";
  }

  return format(date, requestedFormat, { locale: fr });
}

export function formatDateRelative(date: Date | undefined | null): string {
  if (!date) {
    return "(date inconnue)";
  }

  if (differenceInDays(date, new Date()) === 0) {
    return `Aujourd'hui`;
  }
  if (Math.abs(differenceInDays(date, new Date())) <= 7) {
    return formatRelative(date, new Date(), { locale: fr });
  }

  return formatDateAbsolute(date);
}
