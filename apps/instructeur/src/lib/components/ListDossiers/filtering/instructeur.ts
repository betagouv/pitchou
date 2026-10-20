import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { WITHOUT_INSTRUCTEUR, type DossiersQuery, type DossiersContext } from "../query.ts";

/** True when the dossier is followed by at least one person */
export function dossierIsFollowed(
  dossierId: DossierSummary["id"],
  followRelations: DossiersContext["followRelations"],
): boolean {
  if (!followRelations) return false;
  for (const followedDossiers of followRelations.values()) {
    if (followedDossiers.has(dossierId)) return true;
  }
  return false;
}

export function filterByInstructeur(
  result: DossierSummary[],
  query: DossiersQuery,
  followRelations: DossiersContext["followRelations"],
) {
  if (query.instructeur.length) {
    // « sans instructeur » and named instructeurs combine with OR: keep dossiers that are
    // unfollowed and/or followed by any of the selected people.
    const includesWithoutInstructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR);
    const selectedEmails = query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR);
    result = result.filter((dossier) => {
      if (
        includesWithoutInstructeur &&
        dossier.access === "complet" &&
        !dossierIsFollowed(dossier.id, followRelations)
      )
        return true;
      return selectedEmails.some((email) => followRelations?.get(email)?.has(dossier.id) ?? false);
    });
  }
  return result;
}
