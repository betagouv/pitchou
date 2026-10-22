import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { getSessionUser } from "../users.ts";

export class GroupMembershipError extends Error {
  constructor(
    public status: 400 | 403 | 409,
    message: string,
  ) {
    super(message);
  }
}

export async function requireGroupMember(actor: UserId, groupId: string, trx: Knex.Transaction) {
  const user = await getSessionUser(actor, trx);
  if (!user?.groupes.some((group) => group.id === groupId))
    throw new GroupMembershipError(403, "Vous devez être membre de ce groupe actif.");
}
