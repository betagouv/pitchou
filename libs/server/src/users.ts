import type { Knex } from "knex";
import { directDatabaseConnection as database } from "./database/connection.ts";
import {
  effectivePermissions,
  type AuthUser,
  type SessionUser,
  type UserId,
} from "@pitchou/types/permissions.ts";

export async function getUser(
  id: UserId,
  db: Knex.Transaction | Knex = database,
): Promise<AuthUser | undefined> {
  return db("auth_user").where({ id }).first();
}

export async function getSessionUser(
  id: UserId,
  db: Knex.Transaction | Knex = database,
): Promise<SessionUser | null> {
  const user = await getUser(id, db);
  if (!user?.active || !user.email) return null;
  const [bundles, grants, exclusions, groupes] = await Promise.all([
    db("auth_permission_bundle").where({ user_id: id }).pluck("bundle"),
    db("auth_permission").where({ user_id: id }).pluck("permission"),
    db("auth_permission_exclusion").where({ user_id: id }).pluck("permission"),
    db("user_groupe as m")
      .join("groupe_instructeurs as g", "g.id", "m.groupe_instructeurs")
      .where({ "m.user_id": id, "g.active": true })
      .select("g.id", "g.name")
      .orderBy("g.name"),
  ]);
  return {
    ...user,
    email: user.email,
    name: [user.first_names, user.last_name].filter(Boolean).join(" "),
    permissions: effectivePermissions(bundles, grants, exclusions),
    groupes,
  };
}

export type LoginIdentity = {
  issuer: string;
  subject: string;
  email: string;
  firstNames: string;
  lastName: string;
};

export async function connectUser(identity: LoginIdentity, db: Knex = database): Promise<AuthUser> {
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    const email = identity.email.trim().toLowerCase();
    const binding = await trx("auth_identity")
      .where({ issuer: identity.issuer, subject: identity.subject })
      .first();
    let user = binding
      ? await getUser(binding.user_id, trx)
      : await trx("auth_user").where({ email }).first();
    if (!binding && user && (await trx("auth_identity").where({ user_id: user.id }).first())) {
      throw new Error(
        "Cette adresse est déjà associée à une autre identité. Contactez un administrateur.",
      );
    }
    if (!user) {
      [user] = await trx("auth_user")
        .insert({ email, first_names: identity.firstNames, last_name: identity.lastName })
        .returning("*");
    }
    if (!binding)
      await trx("auth_identity").insert({
        issuer: identity.issuer,
        subject: identity.subject,
        user_id: user.id,
      });
    const [updated] = await trx("auth_user")
      .where({ id: user.id })
      .update({
        email,
        first_names: identity.firstNames,
        last_name: identity.lastName,
        first_login_at: user.first_login_at ?? trx.fn.now(),
        last_login_at: trx.fn.now(),
      })
      .returning("*");
    return updated;
  });
}
