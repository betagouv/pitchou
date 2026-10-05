import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type { UserId } from "@pitchou/types/permissions.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { AuthUser as Personne } from "@pitchou/types/permissions.ts";
import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";
import {
  followDossierForPersonnes,
  getAccessibleDossierGroupeMembers,
  unfollowDossierForPersonnes,
} from "./relation_suivi_helpers.ts";

export async function listDossierFollowerCandidates(
  userId: UserId,
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFollowerCandidate[] | undefined> {
  const members = await getAccessibleDossierGroupeMembers(userId, dossierId, databaseConnection);
  if (!members) return undefined;

  const followedPersonneIds = new Set<Personne["id"]>(
    await databaseConnection("edge_personne_follows_dossier")
      .select("personne")
      .where({ dossier: dossierId })
      .whereIn(
        "personne",
        members.map(({ id }) => id),
      )
      .then((rows) => rows.map(({ personne }) => personne)),
  );

  return members.map(({ id, email, firstNames, lastName }) => ({
    email,
    firstNames,
    lastName,
    followsDossier: followedPersonneIds.has(id),
  }));
}

export async function updateDossierFollowers(
  userId: UserId,
  dossierId: Dossier["id"],
  personneEmails: NonNullable<Personne["email"]>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<{ added: string[]; removed: string[] } | false> {
  const members = await getAccessibleDossierGroupeMembers(
    userId,
    dossierId,
    databaseConnection,
    true,
  );
  if (!members) return false;

  const requestedEmails = new Set(personneEmails);
  const memberByEmail = new Map(members.map((member) => [member.email, member]));
  if ([...requestedEmails].some((email) => !memberByEmail.has(email))) return false;

  const selectedPersonneIds = [...requestedEmails].map((email) => memberByEmail.get(email)!.id);
  const memberIds = members.map(({ id }) => id);
  const selectedPersonneIdSet = new Set(selectedPersonneIds);
  const removedPersonneIds = memberIds.filter((id) => !selectedPersonneIdSet.has(id));

  // Actual state change, so the caller can log what happened in the historique.
  const currentFollowerIds = new Set<Personne["id"]>(
    await databaseConnection("edge_personne_follows_dossier")
      .select("personne")
      .where({ dossier: dossierId })
      .whereIn("personne", memberIds)
      .then((rows) => rows.map(({ personne }) => personne)),
  );
  const added = [...requestedEmails].filter(
    (email) => !currentFollowerIds.has(memberByEmail.get(email)!.id),
  );
  const removed = members
    .filter(({ id }) => currentFollowerIds.has(id) && !selectedPersonneIdSet.has(id))
    .map(({ email }) => email);

  await unfollowDossierForPersonnes(removedPersonneIds, dossierId, databaseConnection);
  await followDossierForPersonnes(selectedPersonneIds, dossierId, databaseConnection);

  return { added, removed };
}

export function findFollowerUser(
  userId: UserId,
  personneEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any[]> {
  return databaseConnection("user_groupe as m")
    .join("auth_user as u", "u.id", "m.user_id")
    .join(
      "edge_groupe_instructeurs__dossier as e",
      "e.groupe_instructeurs",
      "m.groupe_instructeurs",
    )
    .whereRaw("pitchou_can_instruct(u.id)")
    .distinct("e.dossier as dossier_id", "u.id as personne_id")
    .where({ "u.id": userId, "u.active": true, "u.email": personneEmail, "e.dossier": dossierId });
}

export async function personneFollowsDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const relation = await databaseConnection("edge_personne_follows_dossier")
    .select("personne")
    .where({ personne: personneId, dossier: dossierId })
    .first();
  return relation !== undefined;
}

export async function instructeurFollowsDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return followDossierForPersonnes([personneId], dossierId, databaseConnection);
}

export async function instructeurLeavesDossier(
  personneId: Personne["id"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<void> {
  return unfollowDossierForPersonnes([personneId], dossierId, databaseConnection);
}
