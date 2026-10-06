import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";

import type {
  default as Personne,
  PersonneInitializer,
} from "@pitchou/types/database/public/Personne.ts";

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

export { getUser as getUserById } from "../users.ts";

export function listAllPersonnes(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Personne[]> {
  return databaseConnection("personne").select();
}
