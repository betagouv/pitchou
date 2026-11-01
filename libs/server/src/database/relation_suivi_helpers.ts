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
  if (!access.has(dossierId)) return undefined;
  return databaseConnection("auth_user as u")
    .where({ "u.id": userId, "u.active": true })
    .whereNotNull("u.email")
    .select("u.id", "u.email", "u.first_names as firstNames", "u.last_name as lastName");
}

export async function followDossierForPersonnes(
  personneIds: Personne["id"][],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex,
): Promise<void> {
  if (personneIds.length === 0) return;
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
  await databaseConnection("edge_personne_follows_dossier")
    .delete()
    .where({ dossier: dossierId })
    .whereIn("personne", personneIds);
}
