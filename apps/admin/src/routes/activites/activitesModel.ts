// Pure view logic of the activity referentiel page: grouping and ordering only, no fetching.

import type {
  ActiviteAdmin,
  ActiviteLabelAdmin,
  ActiviteReferentielAdmin,
} from "$lib/actions/adminActivites.ts";
import { AUTRE_ACTIVITE_CODE } from "$lib/actions/adminActivites.ts";

export type ActiviteGroup = {
  activite: ActiviteAdmin;
  /** Raw « Activité principale » labels grouped under the activity, sorted alphabetically. */
  labels: ActiviteLabelAdmin[];
};

/**
 * One group per activity (even label-less ones, so freshly created activities are visible),
 * activities sorted alphabetically with « Autre » pinned last as it is the catch-all.
 */
export function groupLabelsByActivite(referentiel: ActiviteReferentielAdmin): ActiviteGroup[] {
  const labelsByCode = new Map<string, ActiviteLabelAdmin[]>();
  for (const label of referentiel.labels) {
    const group = labelsByCode.get(label.activite_code) ?? [];
    group.push(label);
    labelsByCode.set(label.activite_code, group);
  }

  const activites = [...referentiel.activites].sort((a, b) => {
    if (a.code === AUTRE_ACTIVITE_CODE) return 1;
    if (b.code === AUTRE_ACTIVITE_CODE) return -1;
    return a.label.localeCompare(b.label, "fr");
  });

  return activites.map((activite) => ({
    activite,
    labels: (labelsByCode.get(activite.code) ?? []).sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    ),
  }));
}

/** The labels awaiting review, oldest detection first so long-pending ones surface on top. */
export function labelsToReview(referentiel: ActiviteReferentielAdmin): ActiviteLabelAdmin[] {
  return referentiel.labels
    .filter((label) => label.needs_review)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
