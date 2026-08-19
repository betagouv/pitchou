// Pure helpers over the activity referentiel served by /api/activites, shared by the forms.

import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import type { ActiviteAdmin, ActiviteReferentielAdmin } from "$lib/actions/adminActivites.ts";

/** The activities ordered for a form select: alphabetical, « Autre » (the catch-all) last. */
export function sortedActivites(referentiel: ActiviteReferentielAdmin): ActiviteAdmin[] {
  return [...referentiel.activites].sort((a, b) => {
    if (a.code === AUTRE_ACTIVITE_CODE) return 1;
    if (b.code === AUTRE_ACTIVITE_CODE) return -1;
    return a.label.localeCompare(b.label, "fr");
  });
}

/** Every known raw label (canonical and historical) mapped to its activity code. */
export function activiteCodeByLabel(referentiel: ActiviteReferentielAdmin): Map<string, string> {
  return new Map(referentiel.labels.map(({ label, activite_code }) => [label, activite_code]));
}
