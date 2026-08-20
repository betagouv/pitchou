// Pure helpers over the activity referentiel served by /api/activites, shared by the forms.

import { AUTRE_ACTIVITE_CODE } from "@pitchou/common/activiteCodes.ts";
import { activiteSelectEntries } from "@pitchou/ui/activites/activiteSelectEntries.ts";
import type { SelectEntry } from "@pitchou/ui/Select/options.ts";
import type { ActiviteAdmin, ActiviteReferentielAdmin } from "$lib/actions/adminActivites.ts";

/** The activities ordered for a form select: alphabetical, « Autre » (the catch-all) last. */
export function sortedActivites(referentiel: ActiviteReferentielAdmin): ActiviteAdmin[] {
  return [...referentiel.activites].sort((a, b) => {
    if (a.code === AUTRE_ACTIVITE_CODE) return 1;
    if (b.code === AUTRE_ACTIVITE_CODE) return -1;
    return a.label.localeCompare(b.label, "fr");
  });
}

/**
 * Grouped, illustrated entries of a form's activity select. Options carry the display name,
 * since dossiers store it in `main_activite`.
 */
export function activiteLabelSelectEntries(
  referentiel: ActiviteReferentielAdmin,
): SelectEntry<string>[] {
  return activiteSelectEntries(referentiel.activites, referentiel.groupes, ({ label }) => label);
}

/** Every known raw label (canonical and historical) mapped to its activity code. */
export function activiteCodeByLabel(referentiel: ActiviteReferentielAdmin): Map<string, string> {
  return new Map(referentiel.labels.map(({ label, activite_code }) => [label, activite_code]));
}

/** Everything the dossier forms need from the referentiel; empty while it has not loaded. */
export function activiteFormContext(referentiel: ActiviteReferentielAdmin | null): {
  activites: ActiviteAdmin[];
  activiteEntries: SelectEntry<string>[];
  codeByLabel: Map<string, string>;
} {
  if (!referentiel) return { activites: [], activiteEntries: [], codeByLabel: new Map() };
  return {
    activites: sortedActivites(referentiel),
    activiteEntries: activiteLabelSelectEntries(referentiel),
    codeByLabel: activiteCodeByLabel(referentiel),
  };
}
