// Builds the entries of an activity dropdown: activities with their icon on their group's
// color, grouped under colored group headers. Shared by the admin referentiel page, the
// dossier forms and the instructeur dossier filters.

import type { SelectEntry } from "../Select/options.ts";
import { activiteIconUrl } from "./activiteIcon.ts";

export type ActiviteForSelect = { code: string; label: string; groupe_code: string };
export type ActiviteGroupeForSelect = { code: string; label: string; color: string };

/**
 * Groups and activities are sorted alphabetically; groups left without any activity are
 * omitted. `value` decides what an option carries — the activity code by default, its label
 * for the dossier forms (dossiers store the display name).
 */
export function activiteSelectEntries(
  activites: ActiviteForSelect[],
  groupes: ActiviteGroupeForSelect[],
  value: (activite: ActiviteForSelect) => string = ({ code }) => code,
): SelectEntry<string>[] {
  const sortedActivites = [...activites].sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return [...groupes]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .map((groupe) => ({
      label: groupe.label,
      color: groupe.color,
      options: sortedActivites
        .filter((activite) => activite.groupe_code === groupe.code)
        .map((activite) => ({
          value: value(activite),
          label: activite.label,
          icon: activiteIconUrl(activite.code),
          color: groupe.color,
        })),
    }))
    .filter((groupe) => groupe.options.length > 0);
}
