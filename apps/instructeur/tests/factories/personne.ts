import type { Knex } from "knex";
import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";
import { randomId } from "./_random.ts";

export type CreatedPersonne = {
  id: number;
  email: string;
  codeAcces: string;
};

export async function createPersonne(
  db: Knex,
  overrides: Partial<PersonneInitializer> = {},
): Promise<CreatedPersonne> {
  const email = overrides.email ?? `${randomId("personne")}@test.fr`;
  const codeAcces = overrides.access_code ?? randomId("code");
  const insert: PersonneInitializer = { ...overrides, email, access_code: codeAcces };
  const [row] = await db("personne").insert(insert).returning("id");
  return { id: row.id, email, codeAcces };
}
