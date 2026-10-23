import type { Knex } from "knex";
import type { MembershipGroup } from "@pitchou/types/groupMembership.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { directDatabaseConnection as database } from "./database/connection.ts";
import { getSessionUser } from "./users.ts";

import { GroupMembershipError, requireGroupMember } from "./groupMembership/access.ts";
import { accountForMembership } from "./groupMembership/accounts.ts";
import { audit } from "./administration/audit.ts";
export { GroupMembershipError } from "./groupMembership/access.ts";

export async function listMembershipGroups(
  actor: UserId,
  db: Knex = database,
): Promise<MembershipGroup[]> {
  return db.transaction(
    async (trx) => {
      const user = await getSessionUser(actor, trx);
      if (!user) throw new GroupMembershipError(403, "Compte inactif ou inaccessible.");
      const members = await trx("user_groupe as m")
        .join("auth_user as u", "u.id", "m.user_id")
        .whereIn(
          "m.groupe_instructeurs",
          user.groupes.map((g) => g.id),
        )
        .select(
          "m.groupe_instructeurs",
          "u.id",
          "u.email",
          "u.first_names",
          "u.last_name",
          "u.active",
        )
        .orderBy("u.email");
      return user.groupes.map((group) => ({
        ...group,
        members: members
          .filter((member) => member.groupe_instructeurs === group.id)
          .map(({ groupe_instructeurs, ...member }) => member),
      }));
    },
    { readOnly: true, isolationLevel: "repeatable read" },
  );
}

export async function addGroupMember(
  actor: UserId,
  groupId: string,
  inputEmail: string,
  db: Knex = database,
) {
  const email = inputEmail.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email))
    throw new GroupMembershipError(400, "Adresse e-mail invalide.");
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupMember(actor, groupId, trx);
    const user = await accountForMembership(email, trx);
    const inserted = await trx("user_groupe")
      .insert({ user_id: user.id, groupe_instructeurs: groupId })
      .onConflict(["user_id", "groupe_instructeurs"])
      .ignore()
      .returning("user_id");
    if (inserted.length > 0)
      await audit(trx, actor, "group_member_added", { groupId, userId: user.id });
  });
}

export async function removeGroupMember(
  actor: UserId,
  groupId: string,
  memberId: UserId,
  db: Knex = database,
) {
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupMember(actor, groupId, trx);
    const removed = await trx("user_groupe")
      .where({ groupe_instructeurs: groupId, user_id: memberId })
      .delete();
    if (removed) await audit(trx, actor, "group_member_removed", { groupId, userId: memberId });
  });
}
