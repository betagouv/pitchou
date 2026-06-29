import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

import {
  SEED_DEMARCHE_NUMBER,
  SEED_GROUPE_INSTRUCTEURS_NAMES,
  SEED_PERSONNES,
} from "../fixtures/users.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";

export async function seed(knex: Knex) {
  await knex("groupe_instructeurs")
    .insert(
      SEED_GROUPE_INSTRUCTEURS_NAMES.map((nom) => ({
        nom,
        numéro_démarche: SEED_DEMARCHE_NUMBER,
      })),
    )
    .onConflict(["nom", "numéro_démarche"])
    .ignore();

  for (const personne of SEED_PERSONNES) {
    const email = personne.email === "dev@localhost.local" ? SEED_EMAIL : personne.email;

    await knex.transaction(async (transaction) => {
      let person = await transaction("personne").where({ email }).first();
      if (!person) {
        const accessCode = randomBytes(16).toString("hex");
        const newPerson: PersonneInitializer = {
          email,
          nom: personne.nom,
          prénoms: personne.prénoms,
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

      const group = await transaction("groupe_instructeurs")
        .where({ nom: personne.groupe, numéro_démarche: SEED_DEMARCHE_NUMBER })
        .first();
      if (group) {
        const groupLink = await transaction("arête_cap_dossier__groupe_instructeurs")
          .where({ cap_dossier: capability.cap, groupe_instructeurs: group.id })
          .first();
        if (!groupLink) {
          await transaction("arête_cap_dossier__groupe_instructeurs").insert({
            cap_dossier: capability.cap,
            groupe_instructeurs: group.id,
          });
        }
      }
    });
  }
}
