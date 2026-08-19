import { getActiviteReferentiel } from "@pitchou/server/database/activite.ts";

/**
 * What the dossier validators need from the activity referentiel. Loaded once per request by the
 * endpoints (the validators themselves stay synchronous) so the accepted « Activité principale »
 * values and the code-keyed business rules follow the referentiel instead of a hardcoded list.
 */
export type ActiviteContext = {
  /** Every raw label the referentiel resolves: activity display names and historical DN labels. */
  acceptedLabels: ReadonlySet<string>;
  codeByLabel: ReadonlyMap<string, string>;
};

export async function loadActiviteContext(): Promise<ActiviteContext> {
  const { activites, labels } = await getActiviteReferentiel();
  return {
    acceptedLabels: new Set([
      ...labels.map(({ label }) => label),
      ...activites.map(({ label }) => label),
    ]),
    codeByLabel: new Map(labels.map(({ label, activite_code }) => [label, activite_code])),
  };
}
