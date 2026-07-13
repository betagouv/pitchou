import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type { DossiersContext, SortKey, SortOrder } from "./dossiersQuery.ts";

function lastModifiedDate(
  dossierId: DossierRésumé["id"],
  notificationParDossier: DossiersContext["notificationParDossier"],
): Date | undefined {
  return notificationParDossier.get(dossierId)?.date_dernière_mise_à_jour ?? undefined;
}

/**
 * « nouveaute » sort: unseen notifications first (most recent first),
 * then by date_dépôt descending.
 */
function compareByNouveaute(
  a: DossierRésumé,
  b: DossierRésumé,
  notificationParDossier: DossiersContext["notificationParDossier"],
): number {
  const notificationA = notificationParDossier.get(a.id);
  const notificationB = notificationParDossier.get(b.id);

  const unseenDateA =
    notificationA?.vue === false ? notificationA.date_dernière_mise_à_jour : undefined;
  const unseenDateB =
    notificationB?.vue === false ? notificationB.date_dernière_mise_à_jour : undefined;

  if (unseenDateA && unseenDateB) {
    return unseenDateA > unseenDateB ? -1 : 1;
  } else if (unseenDateA && unseenDateB === undefined) {
    return -1;
  } else if (unseenDateA === undefined && unseenDateB) {
    return 1;
  }

  return a.date_dépôt > b.date_dépôt ? -1 : 1;
}

export function compareDossiers(
  a: DossierRésumé,
  b: DossierRésumé,
  sortKey: SortKey,
  sortOrder: SortOrder,
  notificationParDossier: DossiersContext["notificationParDossier"],
): number {
  const direction = sortOrder === "asc" ? 1 : -1;

  switch (sortKey) {
    case "name":
      return (a.nom ?? "").localeCompare(b.nom ?? "", "fr") * direction;
    case "depositDate":
      if (a.date_dépôt > b.date_dépôt) return direction;
      if (a.date_dépôt < b.date_dépôt) return -direction;
      return 0;
    case "lastModified": {
      const dateA = lastModifiedDate(a.id, notificationParDossier);
      const dateB = lastModifiedDate(b.id, notificationParDossier);
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
      return compareByNouveaute(a, b, notificationParDossier);
  }
}
