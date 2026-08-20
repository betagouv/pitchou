// Pure view logic of the activity referentiel page: grouping and ordering only, no fetching.

import type { SelectEntry, SelectOption } from "@pitchou/ui/Select/options.ts";
import { activiteSelectEntries as buildActiviteSelectEntries } from "@pitchou/ui/activites/activiteSelectEntries.ts";
import type {
  ActiviteAdmin,
  ActiviteGroupeAdmin,
  ActiviteLabelAdmin,
  ActiviteReferentielAdmin,
} from "$lib/actions/adminActivites.ts";

export type ActiviteWithLabels = {
  activite: ActiviteAdmin;
  /** Raw « Activité principale » labels grouped under the activity, sorted alphabetically. */
  labels: ActiviteLabelAdmin[];
};

export type GroupeSection = {
  groupe: ActiviteGroupeAdmin;
  activites: ActiviteWithLabels[];
};

/**
 * One section per thematic group, groups and activities sorted alphabetically. Label-less
 * activities are kept, so freshly created activities are visible.
 */
export function groupeSections(referentiel: ActiviteReferentielAdmin): GroupeSection[] {
  const labelsByCode = new Map<string, ActiviteLabelAdmin[]>();
  for (const label of referentiel.labels) {
    const group = labelsByCode.get(label.activite_code) ?? [];
    group.push(label);
    labelsByCode.set(label.activite_code, group);
  }

  const activites = [...referentiel.activites]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .map((activite) => ({
      activite,
      labels: (labelsByCode.get(activite.code) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label, "fr"),
      ),
    }));

  return [...referentiel.groupes]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .map((groupe) => ({
      groupe,
      activites: activites.filter(({ activite }) => activite.groupe_code === groupe.code),
    }));
}

/** Options of a group select: alphabetical, each with the group's color as a swatch. */
export function groupeSelectOptions(groupes: ActiviteGroupeAdmin[]): SelectOption<string>[] {
  return [...groupes]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .map(({ code, label, color }) => ({ value: code, label, color }));
}

/**
 * Entries of an activity select: activities with their icon on the group's color, grouped
 * under colored group headers. Options carry the activity code.
 */
export function activiteSelectEntries(
  referentiel: ActiviteReferentielAdmin,
): SelectEntry<string>[] {
  return buildActiviteSelectEntries(referentiel.activites, referentiel.groupes);
}

/** The labels awaiting review, oldest detection first so long-pending ones surface on top. */
export function labelsToReview(referentiel: ActiviteReferentielAdmin): ActiviteLabelAdmin[] {
  return referentiel.labels
    .filter((label) => label.needs_review)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}
