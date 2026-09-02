import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossiersContext, SortKey, SortOrder } from "./query.ts";

function lastModifiedDate(
  dossierId: DossierSummary["id"],
  notificationByDossier: DossiersContext["notificationByDossier"],
): Date | undefined {
  return notificationByDossier.get(dossierId)?.updated_at ?? undefined;
}

/**
 * Compares two dates, placing dossiers with no known date last whatever the direction —
 * an unknown date is not "very old" nor "very recent", it is simply not comparable.
 */
function compareDates(dateA: Date | undefined, dateB: Date | undefined, direction: 1 | -1): number {
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  if (dateA > dateB) return direction;
  if (dateA < dateB) return -direction;
  return 0;
}

function toDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function compareDossiers(
  a: DossierSummary,
  b: DossierSummary,
  sortKey: SortKey,
  sortOrder: SortOrder,
  notificationByDossier: DossiersContext["notificationByDossier"],
): number {
  const direction = sortOrder === "asc" ? 1 : -1;

  switch (sortKey) {
    case "lastModified":
      return compareDates(
        lastModifiedDate(a.id, notificationByDossier),
        lastModifiedDate(b.id, notificationByDossier),
        direction,
      );
    case "nextDueDate":
      return compareDates(toDate(a.next_due_date), toDate(b.next_due_date), direction);
    case "depositDate":
    default:
      return compareDates(toDate(a.depot_date), toDate(b.depot_date), direction);
  }
}
