import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossiersContext, SortKey, SortOrder } from "./dossiersQuery.ts";

function lastModifiedDate(
  dossierId: DossierSummary["id"],
  notificationByDossier: DossiersContext["notificationByDossier"],
): Date | undefined {
  return notificationByDossier.get(dossierId)?.updated_at ?? undefined;
}

/**
 * « nouveaute » sort: unseen notifications first (most recent first),
 * then by depot_date descending.
 */
function compareByNouveaute(
  a: DossierSummary,
  b: DossierSummary,
  notificationByDossier: DossiersContext["notificationByDossier"],
): number {
  const notificationA = notificationByDossier.get(a.id);
  const notificationB = notificationByDossier.get(b.id);

  const unseenDateA = notificationA?.viewed === false ? notificationA.updated_at : undefined;
  const unseenDateB = notificationB?.viewed === false ? notificationB.updated_at : undefined;

  if (unseenDateA && unseenDateB) {
    return unseenDateA > unseenDateB ? -1 : 1;
  } else if (unseenDateA && unseenDateB === undefined) {
    return -1;
  } else if (unseenDateA === undefined && unseenDateB) {
    return 1;
  }

  return a.depot_date > b.depot_date ? -1 : 1;
}

export function compareDossiers(
  a: DossierSummary,
  b: DossierSummary,
  sortKey: SortKey,
  sortOrder: SortOrder,
  notificationByDossier: DossiersContext["notificationByDossier"],
): number {
  const direction = sortOrder === "asc" ? 1 : -1;

  // Dossiers with an unseen nouveauté always float to the top, whatever the chosen sort.
  // The « nouveaute » sort handles this ordering itself, so it is excluded here.
  if (sortKey !== "nouveaute") {
    const unseenA = notificationByDossier.get(a.id)?.viewed === false;
    const unseenB = notificationByDossier.get(b.id)?.viewed === false;
    if (unseenA !== unseenB) return unseenA ? -1 : 1;
  }

  switch (sortKey) {
    case "depositDate":
      if (a.depot_date > b.depot_date) return direction;
      if (a.depot_date < b.depot_date) return -direction;
      return 0;
    case "lastModified": {
      const dateA = lastModifiedDate(a.id, notificationByDossier);
      const dateB = lastModifiedDate(b.id, notificationByDossier);
      // Dossiers with no known date are placed last, regardless of direction
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      if (dateA > dateB) return direction;
      if (dateA < dateB) return -direction;
      return 0;
    }
    case "nouveaute":
    default:
      return compareByNouveaute(a, b, notificationByDossier);
  }
}
