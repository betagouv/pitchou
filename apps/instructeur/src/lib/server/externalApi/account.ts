import { json } from "@sveltejs/kit";
import type { Knex } from "knex";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { withExternalKey } from "@pitchou/server/database/externalApi/access.ts";
import { getSessionUser } from "@pitchou/server/users.ts";
import { listMembershipGroups } from "@pitchou/server/groupMembership.ts";
import { getNotificationsForUser } from "@pitchou/server/database/notification.ts";
import { getRecentSearchesForUser } from "@pitchou/server/database/dossier_search.ts";
import { emailNotificationPreferencesForUser } from "@pitchou/server/database/email_notification_preferences.ts";
import { accountReadScope } from "@pitchou/types/externalApi.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { canReadDossiers } from "../dossierEntry.ts";
import { withApiScope } from "./read.ts";
import { apiProblem } from "./responses.ts";

export async function readAccount(userId: UserId, trx: Knex.Transaction) {
  const user = await getSessionUser(userId, trx);
  if (!user) return;
  return {
    id: user.id,
    email: user.email,
    first_names: user.first_names,
    last_name: user.last_name,
    groupes: user.groupes,
    permissions: user.permissions,
  };
}

export const accountResources = {
  groupes: listMembershipGroups,
  notifications: getNotificationsForUser,
  "notification-preferences": (userId: UserId, trx: Knex.Transaction) =>
    emailNotificationPreferencesForUser(userId, undefined, trx),
  "recent-searches": async (userId: UserId, trx: Knex.Transaction) => {
    const user = await getSessionUser(userId, trx);
    return (await canReadDossiers(user, trx)) ? getRecentSearchesForUser(userId, trx) : [];
  },
};

export function withAccountRead(
  locals: App.Locals,
  read: (userId: UserId, trx: Knex.Transaction) => Promise<unknown>,
) {
  return withApiScope(locals, accountReadScope, async (principal) => {
    if (principal.kind !== "personal") return apiProblem(403, "Une clé personnelle est requise");
    const data = await withExternalKey(
      principal,
      accountReadScope,
      (trx) => read(principal.userId, trx),
      directDatabaseConnection,
    );
    return data === undefined
      ? apiProblem(401, "Compte inaccessible", { "WWW-Authenticate": "Bearer" })
      : json(data);
  });
}
