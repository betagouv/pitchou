//@ts-check

/** @import {Knex} from 'knex' */
/** @import {PersonneInitializer} from '../../scripts/types/database/public/Personne.ts' */
/** @import {GroupeInstructeursInitializer} from '../../scripts/types/database/public/GroupeInstructeurs.ts' */
/** @import {FichierInitializer} from '../../scripts/types/database/public/Fichier.ts' */
/** @import {DescriptionMenacesEspèces} from '../../scripts/types/especes' */

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dsvFormat } from "d3-dsv";
import {
  espèceProtégéeStringToEspèceProtégée,
  construireActivitésMéthodesMoyensDePoursuite,
  descriptionMenacesEspècesToOdsArrayBuffer,
} from "../../scripts/commun/outils-espèces.js";
import { SEED_DEMARCHE_NUMBER, FAKE_DOSSIERS, FAKE_DOSSIER_SCIENTIFIQUE } from "../dossiers.js";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const SEED_GROUP_NAME = "Groupe de démonstration (seed)";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

const AMPHIBIENS_CÔTE_BASQUE = [
  { CD_REF: "444432", nombreIndividus: "12" },
  { CD_REF: "163", nombreIndividus: "8" },
  { CD_REF: "281", nombreIndividus: "24" },
];

/**
 * @param {Knex} knex
 */
export async function seed(knex) {
  const [csvContent, activitésBuffer] = await Promise.all([
    readFile("data/liste-espèces-protégées.csv", "utf-8"),
    readFile("data/activites-methodes-moyens-de-poursuite.ods"),
  ]);

  const espèceByCD_REF = new Map(
    dsvFormat(";")
      .parse(csvContent)
      .map((l) => [l["CD_REF"], espèceProtégéeStringToEspèceProtégée(/** @type {any} */ (l))]),
  );

  const { activités, méthodes, moyensDePoursuite } =
    await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer);

  await knex.transaction(async (transaction) => {
    let person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    if (!person) {
      const accessCode = randomBytes(16).toString("hex");
      /** @type {PersonneInitializer} */
      const newPerson = {
        email: SEED_EMAIL,
        nom: "Dev",
        prénoms: "Local",
        code_accès: accessCode,
      };
      const [inserted] = await transaction("personne")
        .insert(newPerson)
        .returning(["id", "code_accès"]);
      person = inserted;
    } else if (!person.code_accès) {
      const accessCode = randomBytes(16).toString("hex");
      await transaction("personne").where({ id: person.id }).update({ code_accès: accessCode });
      person.code_accès = accessCode;
    }

    let capability = await transaction("cap_dossier")
      .where({ personne_cap: person.code_accès })
      .first();
    if (!capability) {
      const [inserted] = await transaction("cap_dossier")
        .insert({ personne_cap: person.code_accès })
        .returning("cap");
      capability = inserted;
    }

    let group = await transaction("groupe_instructeurs").where({ nom: SEED_GROUP_NAME }).first();
    if (!group) {
      /** @type {GroupeInstructeursInitializer} */
      const newGroup = { nom: SEED_GROUP_NAME, numéro_démarche: SEED_DEMARCHE_NUMBER };
      const [inserted] = await transaction("groupe_instructeurs").insert(newGroup).returning("id");
      group = inserted;
    }

    const groupLink = await transaction("arête_cap_dossier__groupe_instructeurs")
      .where({ cap_dossier: capability.cap, groupe_instructeurs: group.id })
      .first();
    if (!groupLink) {
      await transaction("arête_cap_dossier__groupe_instructeurs").insert({
        cap_dossier: capability.cap,
        groupe_instructeurs: group.id,
      });
    }

    for (const fakeDossier of FAKE_DOSSIERS) {
      let dossier = await transaction("dossier")
        .where({ number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées })
        .first();
      if (!dossier) {
        const [inserted] = await transaction("dossier").insert(fakeDossier).returning("id");
        dossier = inserted;
      }

      const dossierLink = await transaction("arête_groupe_instructeurs__dossier")
        .where({ dossier: dossier.id })
        .first();
      if (!dossierLink) {
        await transaction("arête_groupe_instructeurs__dossier").insert({
          dossier: dossier.id,
          groupe_instructeurs: group.id,
        });
      } else if (dossierLink.groupe_instructeurs !== group.id) {
        await transaction("arête_groupe_instructeurs__dossier")
          .where({ dossier: dossier.id })
          .update({ groupe_instructeurs: group.id });
      }

      if (fakeDossier === FAKE_DOSSIER_SCIENTIFIQUE && !dossier.espèces_impactées) {
        /** @type {DescriptionMenacesEspèces} */
        const descriptionMenaces = {
          oiseau: [],
          "faune non-oiseau": AMPHIBIENS_CÔTE_BASQUE.map(({ CD_REF, nombreIndividus }) => ({
            espèce: /** @type {import('../../scripts/types/especes').EspèceProtégée} */ (
              espèceByCD_REF.get(CD_REF)
            ),
            nombreIndividus,
            // P-30 = Capture/relâcher immédiat, méthode 10 = sélective, moyen 0 = autre/aucune
            activité: activités["faune non-oiseau"].get("P-30"),
            méthode: méthodes["faune non-oiseau"].get("10"),
            moyenDePoursuite: moyensDePoursuite["faune non-oiseau"].get("0"),
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

        const [{ id: fichierId }] = await transaction("fichier").insert(fichier).returning("id");
        await transaction("dossier")
          .where({ id: dossier.id })
          .update({ espèces_impactées: fichierId });
      }
    }

    console.log("");
    console.log("  Seed OK");
    console.log(`  Email : ${SEED_EMAIL}`);
    console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    console.log("");
  });
}
