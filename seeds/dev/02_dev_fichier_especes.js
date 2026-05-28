//@ts-check

/** @import {Knex} from 'knex' */
/** @import {FichierInitializer} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {DescriptionMenacesEspèces} from '../../scripts/types/especes' */

import { readFile } from "node:fs/promises";
import { dsvFormat } from "d3-dsv";
import {
  espèceProtégéeStringToEspèceProtégée,
  construireActivitésMéthodesMoyensDePoursuite,
  descriptionMenacesEspècesToOdsArrayBuffer,
} from "../../scripts/commun/outils-espèces.js";
import { FAKE_DOSSIER_SCIENTIFIQUE } from "../dossiers.js";

// Amphibiens protégés présents sur la Côte basque (CD_REF TAXREF vérifiés dans le CSV)
// 444432 = Triton palmé (Lissotriton helveticus)
// 163    = Triton marbré (Triturus marmoratus)
// 281    = Rainette verte (Hyla arborea)
const AMPHIBIENS = [
  { CD_REF: "444432", nombreIndividus: "12" },
  { CD_REF: "163", nombreIndividus: "8" },
  { CD_REF: "281", nombreIndividus: "24" },
];

/**
 * @param {Knex} knex
 */
export async function seed(knex) {
  const dossier = await knex("dossier")
    .where({
      number_demarches_simplifiées: FAKE_DOSSIER_SCIENTIFIQUE.number_demarches_simplifiées,
    })
    .first();

  if (!dossier || dossier.espèces_impactées) return;

  const [csvContent, activitésBuffer] = await Promise.all([
    readFile("data/liste-espèces-protégées.csv", "utf-8"),
    readFile("data/activites-methodes-moyens-de-poursuite.ods"),
  ]);

  const lignes = dsvFormat(";").parse(csvContent);
  const espèceByCD_REF = new Map(
    lignes.map((l) => [l["CD_REF"], espèceProtégéeStringToEspèceProtégée(/** @type {any} */ (l))]),
  );

  const { activités, méthodes, moyensDePoursuite } =
    await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer);

  // P-30 = Capture/relâcher immédiat, méthode 10 = sélective, moyen 0 = autre/aucune poursuite
  const activité = activités["faune non-oiseau"].get("P-30");
  const méthode = méthodes["faune non-oiseau"].get("10");
  const moyenDePoursuite = moyensDePoursuite["faune non-oiseau"].get("0");

  /** @type {DescriptionMenacesEspèces} */
  const descriptionMenaces = {
    oiseau: [],
    "faune non-oiseau": AMPHIBIENS.map(({ CD_REF, nombreIndividus }) => ({
      espèce: /** @type {import('../../scripts/types/especes').EspèceProtégée} */ (
        espèceByCD_REF.get(CD_REF)
      ),
      nombreIndividus,
      activité,
      méthode,
      moyenDePoursuite,
    })),
    flore: [],
  };

  const odsArrayBuffer = await descriptionMenacesEspècesToOdsArrayBuffer(descriptionMenaces);

  /** @type {FichierInitializer} */
  const fichier = {
    nom: "espèces-impactées-amphibiens-côte-basque.ods",
    media_type: "application/vnd.oasis.opendocument.spreadsheet",
    contenu: Buffer.from(odsArrayBuffer),
  };

  const [{ id: fichierId }] = await knex("fichier").insert(fichier).returning("id");

  await knex("dossier").where({ id: dossier.id }).update({ espèces_impactées: fichierId });
}
