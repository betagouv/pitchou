import { differenceInDays, format, formatRelative } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formats a JavaScript date according to a given format, using the French locale.
 *
 * If the date is `null` or `undefined`, the function returns the string "(date inconnue)".
 * By default, the requested format is: 'd MMMM yyyy'
 */
export function formatDateAbsolue(
  date: Date | string | undefined | null,
  formatDemande: string = "d MMMM yyyy",
): string {
  if (!date) {
    return "(date inconnue)";
  }

  return format(date, formatDemande, { locale: fr });
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

  return formatDateAbsolue(date);
}
