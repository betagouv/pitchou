import type { Knex } from "knex";

export const SEED_GROUP_NAME = "Administrateur";
export const SEED_DEMARCHE_NUMBER = 999999;

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
}
