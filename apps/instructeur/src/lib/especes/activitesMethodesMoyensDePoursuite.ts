import { store } from "$lib/state/store.svelte.ts";
import { dbRowToEspeceProtegee } from "@pitchou/common/especesUtils.ts";
import { referentielRowsToBundle } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegeeRow } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type { ReferentielRows } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

export async function loadEspecesProtegeesList(): Promise<{
  espècesProtégéesParClassification: NonNullable<PitchouState["espècesProtégéesParClassification"]>;
  espèceByCD_REF: NonNullable<PitchouState["espèceByCD_REF"]>;
}> {
  if (store.espècesProtégéesParClassification && store.espèceByCD_REF) {
    const {
      espècesProtégéesParClassification: especesProtegeesParClassification,
      espèceByCD_REF: especeByCD_REF,
    } = store;

    return Promise.resolve({
      espècesProtégéesParClassification: especesProtegeesParClassification,
      espèceByCD_REF: especeByCD_REF,
    });
  }

  const response = await fetch("/api/especes-protegees");
  if (!response.ok) {
    throw new Error(`Échec du chargement des espèces protégées (${response.status})`);
  }
  const rows: EspeceProtegeeRow[] = await response.json();

  const especesProtegeesParClassification: NonNullable<
    PitchouState["espècesProtégéesParClassification"]
  > = {
    oiseau: [],
    "faune non-oiseau": [],
    flore: [],
  };
  const especeByCD_REF: NonNullable<PitchouState["espèceByCD_REF"]> = new Map();

  for (const row of rows) {
    const espece: EspeceProtegee = Object.freeze(dbRowToEspeceProtegee(row));
    const { classification } = espece;

    const especes = especesProtegeesParClassification[classification] || [];
    especes.push(espece);
    especeByCD_REF.set(espece["CD_REF"], espece);

    especesProtegeesParClassification[classification] = especes;
  }

  store.espècesProtégéesParClassification = especesProtegeesParClassification;
  store.espèceByCD_REF = especeByCD_REF;

  return Promise.resolve({
    espècesProtégéesParClassification: especesProtegeesParClassification,
    espèceByCD_REF: especeByCD_REF,
  });
}

/**
 * Loads the referential of types d'impact, méthodes and moyens de poursuite from the database.
 *
 * Returns:
 * - activités: Map indexed by espèce classification (oiseau, faune non-oiseau, flore) containing the threatening activities indexed by their identifiant Pitchou
 * - méthodes: Map indexed by espèce classification containing the threatening methods indexed by their code
 * - moyensDePoursuite: Map indexed by espèce classification containing the threatening means of pursuit indexed by their code
 *
 * @remarks
 * - The function uses a cache in the store to avoid unnecessary reloads. Keep it: the objects it
 *   hands out are what the `<select>`s bind to, and the impacted-espèce importer resolves impacts
 *   to those same instances.
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Reference of the XML schema of the Habides 2.0 directive, defining the activity types.
 */
export async function loadActivitesMethodesMoyensDePoursuite(): Promise<
  NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>
> {
  if (store.ActivitésMéthodesMoyensDePoursuite) {
    return Promise.resolve(store.ActivitésMéthodesMoyensDePoursuite);
  }

  const response = await fetch("/api/referentiel-type-impact-methode-moyen-de-poursuite");
  if (!response.ok) {
    throw new Error(
      `Échec du chargement du référentiel des types d'impact (${response.status})`,
    );
  }
  const rows: ReferentielRows = await response.json();

  const ret = referentielRowsToBundle(rows);

  store.ActivitésMéthodesMoyensDePoursuite = ret;

  return ret;
}
