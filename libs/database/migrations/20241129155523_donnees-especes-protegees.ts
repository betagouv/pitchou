import type { Knex } from "knex";

import { readFile } from "node:fs/promises";
import { dsvFormat } from "d3-dsv";

import {
  importDescriptionMenacesEspecesFromURL,
  descriptionMenacesEspecesToOdsArrayBuffer,
  especeProtegeeStringToEspeceProtegee,
  actMetTransArraysToMapBundle,
} from "@pitchou/common/outils-especes.ts";

/** @import {ActivitéMenançante, EspèceProtégée, MéthodeMenançante, TransportMenançant} from '../scripts/types/especes.js' */
/** @import {PitchouState} from '../scripts/front-end/store.js' */

const { parse } = dsvFormat(";");

export async function up(knex: Knex) {
  const idEtLien = await knex("dossier")
    .select(["id", "espèces_protégées_concernées"])
    .whereNotNull("espèces_protégées_concernées")
    .andWhereNot("espèces_protégées_concernées", "");

  console.log("idEtLien", idEtLien.length);

  if (idEtLien.length === 0) return;

  /** @type { [ActivitéMenançante[], MéthodeMenançante[], TransportMenançant[], any[]] } */
  // @ts-ignore
  const [activitesBrutes, methodesBrutes, transportsBruts, dataEspeces] = await Promise.all([
    readFile("data/activités.csv", "utf-8"),
    readFile("data/méthodes.csv", "utf-8"),
    readFile("data/transports.csv", "utf-8"),
    readFile("data/liste-espèces-protégées.csv", "utf-8"),
  ]).then((fichiers) => fichiers.map((str) => parse(str)));

  // historical migration: the return shape changed (transports -> moyensDePoursuite)
  // and the argument types became stricter, so this call is cast to `any`.
  const {
    activités: activites,
    méthodes: methodes,
    transports,
  } = (actMetTransArraysToMapBundle as any)(activitesBrutes, methodesBrutes, transportsBruts);

  /** @type {NonNullable<PitchouState['espèceByCD_REF']>} */
  const especeByCD_REF = new Map();

  for (const espStr of dataEspeces) {
    /** @type {EspèceProtégée} */
    // @ts-ignore
    const espece = Object.freeze(especeProtegeeStringToEspeceProtegee(espStr));

    especeByCD_REF.set(espece["CD_REF"], espece);
  }

  const especesImpactees = [];

  for (const { id, espèces_protégées_concernées: especes_protegees_concernees } of idEtLien) {
    try {
      if (especes_protegees_concernees) {
        const url = new URL(especes_protegees_concernees);
        const descriptionMenacesEspeces = importDescriptionMenacesEspecesFromURL(
          url,
          especeByCD_REF,
          activites,
          methodes,
          transports,
        );
        if (descriptionMenacesEspeces) {
          const odsArrayBuffer =
            await descriptionMenacesEspecesToOdsArrayBuffer(descriptionMenacesEspeces);
          especesImpactees.push({
            dossier: id,
            nom: "espèces-impactées.ods",
            media_type: "application/vnd.oasis.opendocument.spreadsheet",
            contenu: Buffer.from(odsArrayBuffer), // knex n'accepte que les Buffer node, pas les ArrayBuffer
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  console.log("espèces_impactées", especesImpactees.length);

  await knex("espèces_impactées").insert(especesImpactees);
}

export async function down(knex: Knex) {
  await knex("espèces_impactées").delete();
}
