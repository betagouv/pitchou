import { dossiersAccessibleToUser } from "./dossier/access.ts";
import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { AuthUser as Personne } from "@pitchou/types/permissions.ts";

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
    .whereRaw("pitchou_can_instruct(u.id)")
    .whereNotNull("u.email")
    .distinct("u.id", "u.email", "u.first_names as firstNames", "u.last_name as lastName")
    .orderBy("u.email");
}

export async function followDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (!personneIds.length) return;
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
  if (!personneIds.length) return;
  await databaseConnection("edge_personne_follows_dossier")
    .delete()
    .where({ dossier: dossierId })
    .whereIn("personne", personneIds);
}
