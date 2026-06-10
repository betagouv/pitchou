import type { Knex } from "knex";

import { readFile } from "node:fs/promises";
import { dsvFormat } from "d3-dsv";

import {
  importDescriptionMenacesEspècesFromURL,
  descriptionMenacesEspècesToOdsArrayBuffer,
  espèceProtégéeStringToEspèceProtégée,
  actMetTransArraysToMapBundle,
} from "@pitchou/common/outils-espèces.ts";

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
  const [activitésBrutes, méthodesBrutes, transportsBruts, dataEspèces] = await Promise.all([
    readFile("data/activités.csv", "utf-8"),
    readFile("data/méthodes.csv", "utf-8"),
    readFile("data/transports.csv", "utf-8"),
    readFile("data/liste-espèces-protégées.csv", "utf-8"),
  ]).then((fichiers) => fichiers.map((str) => parse(str)));

  // @ts-ignore migration historique : la forme de retour a évolué (transports -> moyensDePoursuite)
  const { activités, méthodes, transports } = actMetTransArraysToMapBundle(
    // @ts-ignore migration historique : types d'arguments désormais plus stricts
    activitésBrutes,
    méthodesBrutes,
    transportsBruts,
  );

  /** @type {NonNullable<PitchouState['espèceByCD_REF']>} */
  const espèceByCD_REF = new Map();

  for (const espStr of dataEspèces) {
    /** @type {EspèceProtégée} */
    // @ts-ignore
    const espèce = Object.freeze(espèceProtégéeStringToEspèceProtégée(espStr));

    espèceByCD_REF.set(espèce["CD_REF"], espèce);
  }

  const espècesImpactées = [];

  for (const { id, espèces_protégées_concernées } of idEtLien) {
    try {
      if (espèces_protégées_concernées) {
        const url = new URL(espèces_protégées_concernées);
        const descriptionMenacesEspèces = importDescriptionMenacesEspècesFromURL(
          url,
          espèceByCD_REF,
          activités,
          méthodes,
          transports,
        );
        if (descriptionMenacesEspèces) {
          const odsArrayBuffer =
            await descriptionMenacesEspècesToOdsArrayBuffer(descriptionMenacesEspèces);
          espècesImpactées.push({
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

  console.log("espèces_impactées", espècesImpactées.length);

  await knex("espèces_impactées").insert(espècesImpactées);
}

export async function down(knex: Knex) {
  await knex("espèces_impactées").delete();
}
