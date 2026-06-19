import { buffer } from "d3-fetch";
import { store } from "$lib/state/store.svelte.ts";
import { ACTIVITES_METHODES_MOYENS_DE_POURSUITE_DATA } from "$lib/shared/dataPaths.ts";
import {
  dbRowToEspeceProtegee,
  construireActivitésMéthodesMoyensDePoursuite,
} from "@pitchou/common/outils-espèces.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { EspèceProtégée } from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";

export async function chargerListeEspècesProtégées(): Promise<{
  espècesProtégéesParClassification: NonNullable<PitchouState["espècesProtégéesParClassification"]>;
  espèceByCD_REF: NonNullable<PitchouState["espèceByCD_REF"]>;
}> {
  if (store.espècesProtégéesParClassification && store.espèceByCD_REF) {
    const { espècesProtégéesParClassification, espèceByCD_REF } = store;

    return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF });
  }

  const réponse = await fetch("/api/especes-protegees");
  if (!réponse.ok) {
    throw new Error(`Échec du chargement des espèces protégées (${réponse.status})`);
  }
  const lignes: EspeceProtegee[] = await réponse.json();

  const espècesProtégéesParClassification: NonNullable<
    PitchouState["espècesProtégéesParClassification"]
  > = {
    oiseau: [],
    "faune non-oiseau": [],
    flore: [],
  };
  const espèceByCD_REF: NonNullable<PitchouState["espèceByCD_REF"]> = new Map();

  for (const ligne of lignes) {
    const espèce: EspèceProtégée = Object.freeze(dbRowToEspeceProtegee(ligne));
    const { classification } = espèce;

    const espèces = espècesProtégéesParClassification[classification] || [];
    espèces.push(espèce);
    espèceByCD_REF.set(espèce["CD_REF"], espèce);

    espècesProtégéesParClassification[classification] = espèces;
  }

  store.espècesProtégéesParClassification = espècesProtégéesParClassification;
  store.espèceByCD_REF = espèceByCD_REF;

  return Promise.resolve({ espècesProtégéesParClassification, espèceByCD_REF });
}

/**
 * Charge et organise données concernant les activités, méthodes et transports depuis les fichiers CSV externes.
 *
 * Retourne :
 * - activités : Map indexée par classification d'espèce (oiseau, faune non-oiseau, flore) contenant les activités menaçantes indexées par leur code
 * - méthodes : Map indexée par classification d'espèce contenant les méthodes menaçantes indexées par leur code
 * - transports : Map indexée par classification d'espèce contenant les transports menaçants indexés par leur code
 *
 * @remarks
 * - La fonction utilise un cache dans le store pour éviter les rechargements inutiles
 * - Les données sont automatiquement gelées (Object.freeze) pour prévenir les modifications
 * - Cette fonction met également à jour le store avec les activités indexées par code
 * - Les lignes vides dans les fichiers CSV sont automatiquement ignorées
 *
 * @see {@link https://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd}
 * Référence du schéma XML de la directive Habides 2.0, définissant les types d’activités.
 */
export async function chargerActivitésMéthodesMoyensDePoursuite(): Promise<
  NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>
> {
  if (store.ActivitésMéthodesMoyensDePoursuite) {
    return Promise.resolve(store.ActivitésMéthodesMoyensDePoursuite);
  }

  const odsData = await buffer(ACTIVITES_METHODES_MOYENS_DE_POURSUITE_DATA);
  // @ts-ignore
  const ret = await construireActivitésMéthodesMoyensDePoursuite(odsData);

  store.ActivitésMéthodesMoyensDePoursuite = ret;

  return ret;
}
