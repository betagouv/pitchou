//@ts-check

/** @import {Knex} from 'knex' */
/** @import {PersonneInitializer} from '../../scripts/types/database/public/Personne.ts' */
/** @import {GroupeInstructeursInitializer} from '../../scripts/types/database/public/GroupeInstructeurs.ts' */
/** @import {DossierInitializer} from '../../scripts/types/database/public/Dossier.ts' */

import { randomBytes } from "node:crypto";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const SEED_GROUP_NAME = "Groupe de démonstration (seed)";
const SEED_DEMARCHE_NUMBER = 999999;
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

/** @type {Array<Pick<DossierInitializer, 'nom' | 'number_demarches_simplifiées'>>} */
const FAKE_DOSSIERS = [
  { nom: "Parc éolien des Hauteurs (démo)", number_demarches_simplifiées: "999000001" },
  { nom: "Reconstruction pont sur la Loire (démo)", number_demarches_simplifiées: "999000002" },
  { nom: "Carrière de granulats du Sud (démo)", number_demarches_simplifiées: "999000003" },
];

/**
 * @param {Knex} knex
 */
export async function seed(knex) {
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
        /** @type {DossierInitializer} */
        const newDossier = {
          nom: fakeDossier.nom,
          number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées,
          date_dépôt: new Date(),
          numéro_démarche: SEED_DEMARCHE_NUMBER,
        };
        const [inserted] = await transaction("dossier").insert(newDossier).returning("id");
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
    }

    console.log("");
    console.log("  Seed OK");
    console.log(`  Email : ${SEED_EMAIL}`);
    console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    console.log("");
  });
}
