/**
 * Stable codes of the `activite` referentiel (see the creation migration) for the activities that
 * drive behaviour. Business rules must compare these codes — resolved from the raw
 * « Activité principale » label through the `activite_label` table — never raw labels, so that a
 * label renamed in Démarche Numérique keeps triggering the same rules once an administrator has
 * grouped it (on the /activites admin page).
 */

/** Catch-all activity; also where unmapped labels are parked pending admin review. */
export const AUTRE_ACTIVITE_CODE = "autre";

export const RESTAURATION_BATIMENTS_ACTIVITE_CODE = "restauration-batiments";

/** Activities whose dossiers can declare Cigogne nid destructions. */
export const TRANSPORT_ACTIVITE_CODES = ["transport-ferroviaire", "transport-electricite"] as const;

export const EOLIEN_SUIVI_MORTALITE_ACTIVITE_CODE = "energie-eolien-suivi-mortalite";

export const DEMANDE_SCIENTIFIQUE_ACTIVITE_CODE = "demande-scientifique";

/**
 * Resolves a raw « Activité principale » label to its activity code. Labels absent from the
 * referentiel fall back to the « Autre » activity — the same place the DN sync parks them.
 */
export function activiteCodeForLabel(
  label: string | null | undefined,
  activiteCodeByLabel: ReadonlyMap<string, string>,
): string | null {
  if (!label) return null;
  return activiteCodeByLabel.get(label) ?? AUTRE_ACTIVITE_CODE;
}
