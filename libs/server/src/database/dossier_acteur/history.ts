import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonnePhysiqueInitializer } from "@pitchou/types/database/public/PersonnePhysique.ts";
import { involvementLabels, type Involvement } from "@pitchou/types/dossierActeur.ts";
import { identityPropertyLabels } from "@pitchou/types/notification.ts";

export type ActeurValues = { involvement: string; personne: Partial<PersonnePhysiqueInitializer> };

const properties = Object.keys(identityPropertyLabels) as (keyof typeof identityPropertyLabels)[];

function valueOf(
  acteurs: ActeurValues[],
  involvement: string,
  property: keyof typeof identityPropertyLabels,
): string | null {
  const values = acteurs
    .filter((acteur) => acteur.involvement === involvement)
    .map(({ personne }) => personne[property])
    .filter((value): value is string => Boolean(value));
  return values.sort().join(", ") || null;
}

/**
 * Pétitionnaire historique actions, one per changed property of an involvement, with the
 * key `involvement.property`. A baseline is kept in the historique but not notified.
 */
export function actionsFromActeursChanges(
  dossier: DossierId,
  before: ActeurValues[],
  after: ActeurValues[],
  baseline = false,
): ActionDossierInitializer[] {
  const actions: ActionDossierInitializer[] = [];
  for (const [involvement, involvementLabel] of Object.entries(involvementLabels) as [
    Involvement,
    string,
  ][]) {
    for (const property of properties) {
      const from = valueOf(before, involvement, property);
      const to = valueOf(after, involvement, property);
      if (from === to) continue;
      const label = `${involvementLabel} : ${identityPropertyLabels[property]}`;
      actions.push({
        dossier,
        type: "champ_modifie",
        data: {
          field: label,
          label,
          notification_field: `${involvement}.${property}`,
          from,
          to,
          ...(baseline ? { baseline: true } : { notification: true }),
        },
        author_petitionnaire: true,
      });
    }
  }
  return actions;
}
