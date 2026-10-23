import type { Knex } from "knex";
import { createSession } from "@pitchou/server/session.ts";
import { registerSession, sessionUserId } from "../helpers/auth.ts";

// Existing domain fixtures retain their shape while authenticating with a real cookie session.
export async function createCapDossier(db: Knex, personneCap: string): Promise<{ cap: string }> {
  const person = await db("personne").where({ access_code: personneCap }).first();
  await db("auth_user")
    .insert({
      id: person.id,
      email: person.email,
      first_names: person.first_names,
      last_name: person.last_name,
    })
    .onConflict("id")
    .ignore();
  await db.raw(
    "SELECT setval(pg_get_serial_sequence('auth_user', 'id'), (SELECT max(id) FROM auth_user))",
  );
  await db("auth_permission_bundle")
    .insert({ user_id: person.id, bundle: "instructeur" })
    .onConflict(["user_id", "bundle"])
    .ignore();
  const cap = await createSession(
    { userId: person.id, email: person.email, name: "Test", idToken: null },
    db,
  );
  registerSession(cap, person.id);
  return { cap };
}
export const createCapEvenementMetrique = createCapDossier;
export async function attachCapToGroupe(db: Knex, cap: string, groupeId: string): Promise<void> {
  await db("user_groupe")
    .insert({ user_id: sessionUserId(cap), groupe_instructeurs: groupeId })
    .onConflict(["user_id", "groupe_instructeurs"])
    .ignore();
}
