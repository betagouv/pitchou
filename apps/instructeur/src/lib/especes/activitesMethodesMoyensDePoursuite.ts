import { buffer } from "d3-fetch";
import { store } from "$lib/state/store.svelte.ts";
import { ACTIVITES_METHODES_MOYENS_DE_POURSUITE_DATA } from "$lib/shared/dataPaths.ts";
import {
  dbRowToEspeceProtegee,
  construireActivitesMethodesMoyensDePoursuite,
} from "@pitchou/common/especesUtils.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegeeRow } from "@pitchou/types/database/public/EspeceProtegee.ts";

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
 * Loads and organizes data about activities, methods and transports from the external CSV files.
 *
 * Returns:
 * - activités: Map indexed by espèce classification (oiseau, faune non-oiseau, flore) containing the threatening activities indexed by their code
 * - méthodes: Map indexed by espèce classification containing the threatening methods indexed by their code
 * - transports: Map indexed by espèce classification containing the threatening transports indexed by their code
 *
 * @remarks
 * - The function uses a cache in the store to avoid unnecessary reloads
 * - The data is automatically frozen (Object.freeze) to prevent modifications
 * - This function also updates the store with the activities indexed by code
 * - Empty rows in the CSV files are automatically ignored
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

  const odsData = await buffer(ACTIVITES_METHODES_MOYENS_DE_POURSUITE_DATA);
  // @ts-ignore
  const ret = await construireActivitesMethodesMoyensDePoursuite(odsData);

  store.ActivitésMéthodesMoyensDePoursuite = ret;

  return ret;
}
