import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { AuthUser as Personne, UserId } from "@pitchou/types/permissions.ts";
import type { Knex } from "knex";
import { cancelIneligibleNotifications } from "../dossierNotificationEmails/cancellation.ts";
import { lockDossierAccess } from "../dossierRouting.ts";
import { permissionSql } from "../dossierRouting/access.ts";
import { dossiersAccessibleToUser } from "./dossier/access.ts";

export type GroupeMember = {
  id: Personne["id"];
  email: NonNullable<Personne["email"]>;
  firstNames: Personne["first_names"];
  lastName: Personne["last_name"];
};

export async function getAccessibleDossierGroupeMembers(
  userId: UserId,
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
  lockForUpdate = false,
): Promise<GroupeMember[] | undefined> {
  if (lockForUpdate) await databaseConnection.raw("select pg_advisory_xact_lock(2105102026)");
  const access = await dossiersAccessibleToUser(dossierId, userId, databaseConnection);
  if (access.get(dossierId) !== "complet") return undefined;
  return databaseConnection("user_groupe as m")
    .join("auth_user as u", "u.id", "m.user_id")
    .join("groupe_instructeurs as g", "g.id", "m.groupe_instructeurs")
    .join("edge_groupe_instructeurs__dossier as e", "e.groupe_instructeurs", "g.id")
    .where({ "e.dossier": dossierId, "u.active": true, "g.active": true })
    .whereRaw(
      `${permissionSql("u.id", "dossier:read")} AND ${permissionSql("u.id", "dossier:instruct")}`,
    )
    .whereNotNull("u.email")
    .distinct("u.id", "u.email", "u.first_names as firstNames", "u.last_name as lastName")
    .orderBy("u.email");
}

export async function followDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (personneIds.length === 0) return;
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      followDossierForPersonnes(personneIds, dossierId, trx),
    );
  await lockDossierAccess(databaseConnection as Knex.Transaction);
  await databaseConnection("edge_personne_follows_dossier")
    .insert(personneIds.map((personne) => ({ personne, dossier: dossierId })))
    .onConflict(["personne", "dossier"])
    .ignore();
}

export async function unfollowDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (personneIds.length === 0) return;
  if (!databaseConnection.isTransaction)
    return databaseConnection.transaction((trx) =>
      unfollowDossierForPersonnes(personneIds, dossierId, trx),
    );
  await lockDossierAccess(databaseConnection as Knex.Transaction);
  await databaseConnection("edge_personne_follows_dossier")
    .delete()
    .where({ dossier: dossierId })
    .whereIn("personne", personneIds);
  await cancelIneligibleNotifications(databaseConnection as Knex.Transaction, {
    dossiers: [dossierId],
    users: personneIds,
  });
}
