import { directDatabaseConnection as db } from "../database/connection.ts";
import { getSessionUser } from "../users.ts";
import { audit } from "./audit.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
export async function listGroups() {
  const [groups, departments, members, counts, users] = await Promise.all([
    db("groupe_instructeurs").orderBy("name"),
    db("groupe_departement"),
    db("user_groupe"),
    db("edge_groupe_instructeurs__dossier")
      .select("groupe_instructeurs")
      .count("dossier as count")
      .groupBy("groupe_instructeurs"),
    db("auth_user").select("id", "email", "active").orderBy("email"),
  ]);
  return {
    groups: groups.map((g) => ({
      ...g,
      departments: departments
        .filter((d) => d.groupe_instructeurs === g.id)
        .map((d) => d.department),
      members: members.filter((m) => m.groupe_instructeurs === g.id).map((m) => m.user_id),
      dossierCount: Number(counts.find((c) => c.groupe_instructeurs === g.id)?.count ?? 0),
    })),
    users,
  };
}

export type GroupUpdate = {
  id?: string;
  name: string;
  active: boolean;
  departments: string[];
  members: number[];
};
export async function saveGroup(actor: UserId, input: GroupUpdate) {
  if (!input.name.trim()) throw new TypeError("Le nom du groupe est requis");
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    const before = input.id
      ? await trx("groupe_instructeurs").where({ id: input.id }).first()
      : null;
    const currentActor = await getSessionUser(actor, trx);
    if (
      !currentActor?.permissions.includes("admin:access") ||
      !currentActor.permissions.includes("groups:manage")
    )
      throw new TypeError("Gestion des groupes non autorisée");
    if (input.id && !before) throw new TypeError("Groupe introuvable");
    if (before) {
      before.departments = await trx("groupe_departement")
        .where({ groupe_instructeurs: before.id })
        .pluck("department");
      before.members = await trx("user_groupe")
        .where({ groupe_instructeurs: before.id })
        .pluck("user_id");
    }
    const values = { name: input.name.trim(), active: input.active, coverage_needs_review: false };
    const [group] = before
      ? await trx("groupe_instructeurs").where({ id: input.id }).update(values).returning("*")
      : await trx("groupe_instructeurs").insert(values).returning("*");
    // Add before removing so followers retain eligibility through unchanged coverage.
    if (input.departments.length)
      await trx("groupe_departement")
        .insert(
          [...new Set(input.departments)].map((department) => ({
            groupe_instructeurs: group.id,
            department,
          })),
        )
        .onConflict(["groupe_instructeurs", "department"])
        .ignore();
    await trx("groupe_departement")
      .where({ groupe_instructeurs: group.id })
      .whereNotIn("department", input.departments)
      .delete();
    if (input.members.length)
      await trx("user_groupe")
        .insert(
          [...new Set(input.members)].map((user_id) => ({
            groupe_instructeurs: group.id,
            user_id,
          })),
        )
        .onConflict(["user_id", "groupe_instructeurs"])
        .ignore();
    await trx("user_groupe")
      .where({ groupe_instructeurs: group.id })
      .whereNotIn("user_id", input.members)
      .delete();
    await audit(trx, actor, "group_saved", { id: group.id, before, after: input });
    return group;
  });
}
