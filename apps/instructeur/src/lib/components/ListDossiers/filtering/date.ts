import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DateField, DossiersQuery, DossiersContext } from "../query.ts";

/** Dossier date matching the field chosen in the « dates » filter */
export function dossierDate(
  dossier: DossierSummary,
  field: DateField,
  notificationByDossier: DossiersContext["notificationByDossier"],
): Date | undefined {
  switch (field) {
    case "phaseStart":
      return dossier.phase_start_date ?? undefined;
    case "lastModified":
      return notificationByDossier.get(dossier.id)?.updated_at ?? undefined;
    case "nextDue":
      // A dossier with no échéance never matches an échéance date range.
      return dossier.next_due_date ? new Date(dossier.next_due_date) : undefined;
    case "deposit":
    default:
      return dossier.depot_date ?? undefined;
  }
}

export function filterByDate(
  result: DossierSummary[],
  query: DossiersQuery,
  notificationByDossier: DossiersContext["notificationByDossier"],
) {
  if (query.dateStart || query.dateEnd) {
    const start = query.dateStart ? new Date(`${query.dateStart}T00:00:00`) : undefined;
    const end = query.dateEnd ? new Date(`${query.dateEnd}T23:59:59.999`) : undefined;
    result = result.filter((dossier) => {
      const date = dossierDate(dossier, query.dateField, notificationByDossier);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }

  return result;
}
