import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

import {
  SEED_DEMARCHE_NUMBER,
  SEED_GROUPE_INSTRUCTEURS_NAMES,
} from "../fixtures/demarche_numerique.ts";
import { SEED_PERSONNES } from "../fixtures/users.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";

export async function seed(knex: Knex) {
  await knex("groupe_instructeurs")
    .insert(
      SEED_GROUPE_INSTRUCTEURS_NAMES.map((name) => ({
        name,
        demarche_number: SEED_DEMARCHE_NUMBER,
      })),
    )
    .onConflict(["name", "demarche_number"])
    .ignore();

  for (const personne of SEED_PERSONNES) {
    const email = personne.email === "dev@localhost.local" ? SEED_EMAIL : personne.email;

    await knex.transaction(async (transaction) => {
      let person = await transaction("personne").where({ email }).first();
      if (!person) {
        const accessCode = randomBytes(16).toString("hex");
        const newPerson: PersonneInitializer = {
          email,
          last_name: personne.last_name,
          first_names: personne.first_names,
          access_code: accessCode,
        };
        const [inserted] = await transaction("personne")
          .insert(newPerson)
          .returning(["id", "access_code"]);
        person = inserted;
      } else if (!person.access_code) {
        const accessCode = randomBytes(16).toString("hex");
        await transaction("personne").where({ id: person.id }).update({ access_code: accessCode });
        person.access_code = accessCode;
      }

      let capability = await transaction("cap_dossier")
        .where({ personne_cap: person.access_code })
        .first();
      if (!capability) {
        const [inserted] = await transaction("cap_dossier")
          .insert({ personne_cap: person.access_code })
          .returning("cap");
        capability = inserted;
      }

      await transaction("cap_evenement_metrique")
        .insert({ personne_cap: person.access_code })
        .onConflict("personne_cap")
        .ignore();

      const group = await transaction("groupe_instructeurs")
        .where({ name: personne.groupe, demarche_number: SEED_DEMARCHE_NUMBER })
        .first();
      if (group) {
        const groupLink = await transaction("edge_cap_dossier__groupe_instructeurs")
          .where({ cap_dossier: capability.cap, groupe_instructeurs: group.id })
          .first();
        if (!groupLink) {
          await transaction("edge_cap_dossier__groupe_instructeurs").insert({
            cap_dossier: capability.cap,
            groupe_instructeurs: group.id,
          });
        }
      }
    });
  }
}
