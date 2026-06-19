import { differenceInDays, format, formatRelative } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formate une date JavaScript selon un format spécifié, en utilisant la locale française.
 *
 * Si la date est `null` ou `undefined`, la fonction retourne la chaîne "(date inconnue)".
 * Par défaut, le format demandé est : 'd MMMM yyyy'
 */
export function formatDateAbsolue(
  date: Date | string | undefined | null,
  formatDemandé: string = "d MMMM yyyy",
): string {
  if (!date) {
    return "(date inconnue)";
  }

  return format(date, formatDemandé, { locale: fr });
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
