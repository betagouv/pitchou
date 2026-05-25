import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { normalisationEmail } from "../../commun/manipulationStrings.ts";

import type {
  default as Personne,
  PersonneInitializer,
} from "../../types/database/public/Personne.ts";
import type { default as CapDossier } from "../../types/database/public/CapDossier.ts";

export function créerPersonne(
  personne: PersonneInitializer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const normalised = personne.email
    ? { ...personne, email: normalisationEmail(personne.email) }
    : personne;

  return databaseConnection("personne").insert(normalised);
}

export function créerPersonnes(
  personnes: PersonneInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: Personne["id"] }[]> {
  if (personnes.length === 0) return Promise.resolve([]);

  const normalised = personnes.map((personne) =>
    personne.email ? { ...personne, email: normalisationEmail(personne.email) } : personne,
  );

  return databaseConnection("personne").insert(normalised, ["id"]);
}

export function getPersonneByCode(
  code_accès: Personne["code_accès"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne | undefined> {
  return databaseConnection("personne").where({ code_accès }).select("id").first();
}

export function getPersonneByEmail(
  email: Personne["email"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne | undefined> {
  return databaseConnection("personne").select("*").where({ email }).first();
}

export function getPersonnesByEmail(
  emails: Personne["email"][],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne[]> {
  return databaseConnection("personne").select().whereIn("email", emails);
}

export function getPersonneByDossierCap(
  cap: CapDossier["cap"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne | undefined> {
  return databaseConnection("personne")
    .select(["personne.id", "personne.email"])
    .leftJoin("cap_dossier", { "cap_dossier.personne_cap": "personne.code_accès" })
    .where("cap_dossier.cap", cap)
    .first();
}

function updateCodeAccès(
  email: Personne["email"],
  code_accès: Personne["code_accès"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("personne").where({ email }).update({ code_accès });
}

export function créerPersonneOuMettreÀJourCodeAccès(
  email: Personne["email"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string> {
  const codeAccès = randomBytes(32).toString("base64url");

  return créerPersonne(
    {
      nom: "",
      prénoms: "",
      email,
      code_accès: codeAccès,
    },
    databaseConnection,
  )
    .catch((err) => {
      // 23505 = unique_violation in PostgreSQL. Assume the email already exists.
      if (err?.code === "23505") {
        return updateCodeAccès(email, codeAccès, databaseConnection);
      }
      throw err;
    })
    .then(() => codeAccès);
}

export function listAllPersonnes(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne[]> {
  return databaseConnection("personne").select();
}
