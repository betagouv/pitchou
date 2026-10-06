import { directDatabaseConnection as db } from "../database/connection.ts";
import { getSessionUser } from "../users.ts";
import { audit } from "./audit.ts";
import { BUNDLES, PERMISSIONS, type UserId } from "@pitchou/types/permissions.ts";
export async function listUsers() {
  const [users, bundles, grants, exclusions, memberships] = await Promise.all([
    db("auth_user").select("*").orderBy("email"),
    db("auth_permission_bundle"),
    db("auth_permission"),
    db("auth_permission_exclusion"),
    db("user_groupe as m")
      .join("groupe_instructeurs as g", "g.id", "m.groupe_instructeurs")
      .select("m.user_id", "g.id", "g.name", "g.active"),
  ]);
  return users.map((user) => ({
    ...user,
    bundles: bundles.filter((row) => row.user_id === user.id).map((row) => row.bundle),
    grants: grants.filter((row) => row.user_id === user.id).map((row) => row.permission),
    exclusions: exclusions.filter((row) => row.user_id === user.id).map((row) => row.permission),
    groupes: memberships.filter((row) => row.user_id === user.id),
  }));
}

export type UserUpdate = {
  id?: number;
  email: string;
  active: boolean;
  bundles: string[];
  grants: string[];
  exclusions: string[];
  groupIds?: string[];
};

export async function listUserGroupOptions() {
  return db("groupe_instructeurs")
    .select("id", "name", "active")
    .orderBy("active", "desc")
    .orderBy("name");
}
export async function saveUser(actor: UserId, input: UserUpdate) {
  if (!input.id && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    throw new TypeError("Adresse e-mail invalide");
  if (
    input.bundles.some((value) => !Object.hasOwn(BUNDLES, value)) ||
    [...input.grants, ...input.exclusions].some((value) => !Object.hasOwn(PERMISSIONS, value))
  )
    throw new TypeError("Permission inconnue");
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    if (input.groupIds !== undefined) {
      const actorBefore = await getSessionUser(actor, trx);
      if (!actorBefore?.permissions.includes("groups:manage"))
        throw new TypeError("Gestion des groupes non autorisée");
      const groups = await trx("groupe_instructeurs").whereIn("id", input.groupIds).select("id");
      if (groups.length !== new Set(input.groupIds).size)
        throw new TypeError("Un groupe est introuvable. Actualisez la page.");
    }
    const before = input.id ? await trx("auth_user").where({ id: input.id }).first() : null;
    if (input.id && !before) throw new TypeError("Utilisateur introuvable");
    if (before) {
      before.bundles = await trx("auth_permission_bundle")
        .where({ user_id: before.id })
        .pluck("bundle");
      before.grants = await trx("auth_permission")
        .where({ user_id: before.id })
        .pluck("permission");
      before.exclusions = await trx("auth_permission_exclusion")
        .where({ user_id: before.id })
        .pluck("permission");
      before.groupIds = await trx("user_groupe")
        .where({ user_id: before.id })
        .pluck("groupe_instructeurs");
    }
    if (before && (before.email ?? "") !== input.email.trim().toLowerCase())
      throw new TypeError("L'adresse d'un compte existant provient de ProConnect");
    const [user] = before
      ? await trx("auth_user")
          .where({ id: before.id })
          .update({ active: input.active })
          .returning("*")
      : await trx("auth_user")
          .insert({ email: input.email.trim().toLowerCase(), active: input.active })
          .returning("*");
    const assignments = [
      ["auth_permission_bundle", "bundle", input.bundles],
      ["auth_permission", "permission", input.grants],
      ["auth_permission_exclusion", "permission", input.exclusions],
    ] as const;
    for (const [table, column, values] of assignments) {
      if (values.length)
        await trx(table)
          .insert([...new Set(values)].map((value) => ({ user_id: user.id, [column]: value })))
          .onConflict(["user_id", column])
          .ignore();
    }
    for (const [table, column, values] of assignments) {
      await trx(table).where({ user_id: user.id }).whereNotIn(column, values).delete();
    }
    if (input.groupIds !== undefined) {
      // Keep shared memberships in place so changing groups preserves eligible followers.
      if (input.groupIds.length)
        await trx("user_groupe")
          .insert(
            [...new Set(input.groupIds)].map((groupe_instructeurs) => ({
              user_id: user.id,
              groupe_instructeurs,
            })),
          )
          .onConflict(["user_id", "groupe_instructeurs"])
          .ignore();
      await trx("user_groupe")
        .where({ user_id: user.id })
        .whereNotIn("groupe_instructeurs", input.groupIds)
        .delete();
    }
    const currentActor = await getSessionUser(actor, trx);
    if (
      !currentActor?.permissions.includes("admin:access") ||
      !currentActor.permissions.includes("users:manage")
    )
      throw new TypeError(
        "Vous ne pouvez pas retirer vos propres droits d'administration des utilisateurs",
      );
    if (!input.active) await trx("session").where({ user_id: user.id }).delete();
    await audit(trx, actor, "user_saved", { id: user.id, before, after: input });
    return user;
  });
}
