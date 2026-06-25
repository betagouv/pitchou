import type { Knex } from "knex";

import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";

import { SEED_GROUP_NAME, SEED_DEMARCHE_NUMBER } from "./06_users.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

const FAKE_DOSSIERS: Pick<DossierInitializer, "nom" | "number_demarches_simplifiées">[] = [
  { nom: "Parc éolien des Hauteurs (démo)", number_demarches_simplifiées: "999000001" },
  { nom: "Reconstruction pont sur la Loire (démo)", number_demarches_simplifiées: "999000002" },
  { nom: "Carrière de granulats du Sud (démo)", number_demarches_simplifiées: "999000003" },
];

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    const person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    const group = await transaction("groupe_instructeurs").where({ nom: SEED_GROUP_NAME }).first();

    for (const fakeDossier of FAKE_DOSSIERS) {
      let dossier = await transaction("dossier")
        .where({ number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées })
        .first();
      if (!dossier) {
        const newDossier: DossierInitializer = {
          nom: fakeDossier.nom,
          number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées,
          date_dépôt: new Date(),
          numéro_démarche: SEED_DEMARCHE_NUMBER,
        };
        const [inserted] = await transaction("dossier").insert(newDossier).returning("id");
        dossier = inserted;
      }

      if (group) {
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
    }

    console.log("");
    console.log("  Seed OK");
    console.log(`  Email : ${SEED_EMAIL}`);
    if (person?.code_accès) {
      console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    }
    console.log("");
  });
}
