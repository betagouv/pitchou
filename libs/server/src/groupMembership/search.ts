import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { GroupMemberCandidate } from "@pitchou/types/groupMembership.ts";
import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { directDatabaseConnection as database } from "../database/connection.ts";
import { requireGroupMember } from "./access.ts";

export async function searchGroupMemberCandidates(
  actor: UserId,
  groupId: string,
  search: string,
  db: Knex = database,
): Promise<GroupMemberCandidate[]> {
  async function read(trx: Knex.Transaction) {
    await requireGroupMember(actor, groupId, trx);
    const query = trx("auth_user as u")
      .select("u.id", "u.email", "u.first_names", "u.last_name")
      .where("u.active", true)
      .whereNotNull("u.email")
      .whereNot("u.email", "")
      .whereNotExists(
        trx("user_groupe as m")
          .select(trx.raw("1"))
          .whereRaw("m.user_id = u.id")
          .where("m.groupe_instructeurs", groupId),
      );
    const parts = removeAccents(search).toLocaleLowerCase("fr").trim().split(/\s+/u);
    for (const part of parts.filter(Boolean)) {
      const literal = part.replaceAll(/[\\%_]/gu, "\\$&");
      query.whereRaw(
        "translate(lower(concat_ws(' ', u.first_names, u.last_name, u.email)), 'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc') like ?",
        [`%${literal}%`],
      );
    }
    return query.orderBy("u.email").limit(20);
  }
  if (db.isTransaction) return read(db as Knex.Transaction);
  return db.transaction(read, { readOnly: true, isolationLevel: "repeatable read" });
}
