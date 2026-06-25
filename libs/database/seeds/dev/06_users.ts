import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

export const SEED_GROUP_NAME = "Administrateur";
export const SEED_DEMARCHE_NUMBER = 999999;

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";

const SEED_GROUPE_INSTRUCTEURS_NAMES = [
  "Administrateur",
  "Dév Pitchou",
  "DREAL Nouvelle-Aquitaine",
  "DREAL Occitanie",
  "Multi-régions",
  "DDT02 -  AISNE",
  "DDT59 - NORD",
  "DREAL Grand Est",
  "DEAL Réunion",
  "DREAL Auvergne-Rhône-Alpes",
  "DREAL BRETAGNE",
  "DREAL Normandie",
  "DDT 45 - Loiret",
  "DREAL BFC",
  "DRIAT IDF",
  "DDT02",
  "DREAL de Corse et DMLC",
  "DDT37",
  "DREAL Pays de la loire",
  "DGTM Guyane",
  "DDT 41",
  "DREAL Centre Val de Loire",
];

export const SEED_PERSONNES: (Pick<PersonneInitializer, "nom" | "prénoms" | "email"> & {
  groupe: string;
})[] = [
  { prénoms: "Local", nom: "Dev", email: SEED_EMAIL, groupe: "Administrateur" },
  {
    prénoms: "Camille",
    nom: "Rousseau",
    email: "camille.rousseau@dev.pitchou.fr",
    groupe: "Dév Pitchou",
  },
  {
    prénoms: "Marie",
    nom: "Fontaine",
    email: "marie.fontaine@dreal-na.gouv.fr",
    groupe: "DREAL Nouvelle-Aquitaine",
  },
  {
    prénoms: "Jean-Pierre",
    nom: "Moreau",
    email: "jp.moreau@dreal-oc.gouv.fr",
    groupe: "DREAL Occitanie",
  },
  {
    prénoms: "Sophie",
    nom: "Laurent",
    email: "sophie.laurent@ddt02.gouv.fr",
    groupe: "DDT02 -  AISNE",
  },
  {
    prénoms: "Marc",
    nom: "Petit",
    email: "marc.petit@ddt59.gouv.fr",
    groupe: "DDT59 - NORD",
  },
  {
    prénoms: "Isabelle",
    nom: "Lefebvre",
    email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    groupe: "DREAL Grand Est",
  },
  {
    prénoms: "Thomas",
    nom: "Girard",
    email: "thomas.girard@dreal-ara.gouv.fr",
    groupe: "DREAL Auvergne-Rhône-Alpes",
  },
  {
    prénoms: "Claire",
    nom: "Morin",
    email: "claire.morin@dreal-bretagne.gouv.fr",
    groupe: "DREAL BRETAGNE",
  },
  {
    prénoms: "Nathalie",
    nom: "Chevalier",
    email: "nathalie.chevalier@deal-reunion.gouv.fr",
    groupe: "DEAL Réunion",
  },
  {
    prénoms: "Antoine",
    nom: "Dubois",
    email: "antoine.dubois@multi-regions.gouv.fr",
    groupe: "Multi-régions",
  },
  {
    prénoms: "Élodie",
    nom: "Bernard",
    email: "elodie.bernard@dreal-normandie.gouv.fr",
    groupe: "DREAL Normandie",
  },
  {
    prénoms: "François",
    nom: "Durand",
    email: "francois.durand@ddt45.gouv.fr",
    groupe: "DDT 45 - Loiret",
  },
  {
    prénoms: "Aurélie",
    nom: "Simon",
    email: "aurelie.simon@dreal-bfc.gouv.fr",
    groupe: "DREAL BFC",
  },
  {
    prénoms: "Nicolas",
    nom: "Martin",
    email: "nicolas.martin@driat-idf.gouv.fr",
    groupe: "DRIAT IDF",
  },
  {
    prénoms: "Céline",
    nom: "Leroy",
    email: "celine.leroy@ddt02.gouv.fr",
    groupe: "DDT02",
  },
  {
    prénoms: "Pierre-Antoine",
    nom: "Rossi",
    email: "pa.rossi@dreal-corse.gouv.fr",
    groupe: "DREAL de Corse et DMLC",
  },
  {
    prénoms: "Virginie",
    nom: "Blanc",
    email: "virginie.blanc@ddt37.gouv.fr",
    groupe: "DDT37",
  },
  {
    prénoms: "Stéphane",
    nom: "Richard",
    email: "stephane.richard@dreal-pdl.gouv.fr",
    groupe: "DREAL Pays de la loire",
  },
  {
    prénoms: "Audrey",
    nom: "Mercier",
    email: "audrey.mercier@dgtm-guyane.gouv.fr",
    groupe: "DGTM Guyane",
  },
  {
    prénoms: "Benoît",
    nom: "Perrin",
    email: "benoit.perrin@ddt41.gouv.fr",
    groupe: "DDT 41",
  },
  {
    prénoms: "Sylvie",
    nom: "Arnaud",
    email: "sylvie.arnaud@dreal-cvdl.gouv.fr",
    groupe: "DREAL Centre Val de Loire",
  },
];

export async function seed(knex: Knex) {
  await knex("groupe_instructeurs")
    .insert(
      SEED_GROUPE_INSTRUCTEURS_NAMES.map((nom) => ({
        nom,
        numéro_démarche: SEED_DEMARCHE_NUMBER,
      })),
    )
    .onConflict("nom")
    .ignore();

  for (const personne of SEED_PERSONNES) {
    await knex.transaction(async (transaction) => {
      let person = await transaction("personne").where({ email: personne.email }).first();
      if (!person) {
        const accessCode = randomBytes(16).toString("hex");
        const newPerson: PersonneInitializer = {
          email: personne.email,
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
        .where({ nom: personne.groupe })
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
