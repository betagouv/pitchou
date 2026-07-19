import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";

import type {
  default as Personne,
  PersonneInitializer,
} from "@pitchou/types/database/public/Personne.ts";
import type { default as CapDossier } from "@pitchou/types/database/public/CapDossier.ts";

export function createPersonne(
  personne: PersonneInitializer,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const normalised = personne.email
    ? { ...personne, email: normalizeEmail(personne.email) }
    : personne;

  return databaseConnection("personne").insert(normalised);
}

export function createPersonnes(
  personnes: PersonneInitializer[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ id: Personne["id"] }[]> {
  if (personnes.length === 0) return Promise.resolve([]);

  const normalised = personnes.map((personne) =>
    personne.email ? { ...personne, email: normalizeEmail(personne.email) } : personne,
  );

  return databaseConnection("personne").insert(normalised, ["id"]);
}

export function getPersonneByCode(
  accessCode: Personne["access_code"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne | undefined> {
  return databaseConnection("personne").where({ access_code: accessCode }).select("id").first();
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
    .leftJoin("cap_dossier", { "cap_dossier.personne_cap": "personne.access_code" })
    .where("cap_dossier.cap", cap)
    .first();
}

function updateCodeAcces(
  email: Personne["email"],
  accessCode: Personne["access_code"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  return databaseConnection("personne").where({ email }).update({ access_code: accessCode });
}

export function createPersonneOrUpdateCodeAcces(
  email: Personne["email"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<string> {
  const codeAcces = randomBytes(32).toString("base64url");

  return createPersonne(
    {
      last_name: "",
      first_names: "",
      email,
      access_code: codeAcces,
    },
    databaseConnection,
  )
    .catch((err) => {
      // 23505 = unique_violation in PostgreSQL. Assume the email already exists.
      if (err?.code === "23505") {
        return updateCodeAcces(email, codeAcces, databaseConnection);
      }
      throw err;
    })
    .then(() => codeAcces);
}

export function listAllPersonnes(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne[]> {
  return databaseConnection("personne").select();
}
