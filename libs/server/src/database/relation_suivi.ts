import type { Knex } from "knex";

import { directDatabaseConnection } from "../database.ts";

import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";
import {
  followDossierForPersonnes,
  getAccessibleDossierGroupeMembers,
  unfollowDossierForPersonnes,
} from "./relation_suivi_helpers.ts";

export async function listDossierFollowerCandidatesFromCap(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierFollowerCandidate[] | undefined> {
  const members = await getAccessibleDossierGroupeMembers(cap, dossierId, databaseConnection);
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

export async function updateDossierFollowersFromCap(
  cap: CapDossier["cap"],
  dossierId: Dossier["id"],
  personneEmails: NonNullable<Personne["email"]>[],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<boolean> {
  const members = await getAccessibleDossierGroupeMembers(cap, dossierId, databaseConnection, true);
  if (!members) return false;

  const requestedEmails = new Set(personneEmails);
  const memberByEmail = new Map(members.map((member) => [member.email, member]));
  if ([...requestedEmails].some((email) => !memberByEmail.has(email))) return false;

  const selectedPersonneIds = [...requestedEmails].map((email) => memberByEmail.get(email)!.id);
  const memberIds = members.map(({ id }) => id);
  const selectedPersonneIdSet = new Set(selectedPersonneIds);
  const removedPersonneIds = memberIds.filter((id) => !selectedPersonneIdSet.has(id));

  await unfollowDossierForPersonnes(removedPersonneIds, dossierId, databaseConnection);
  await followDossierForPersonnes(selectedPersonneIds, dossierId, databaseConnection);

  return true;
}

export function findRelationPersonneFromCap(
  cap: CapDossier["cap"],
  personneEmail: NonNullable<Personne["email"]>,
  dossierId: Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<any[]> {
  return databaseConnection("cap_dossier")
    .select([
      "edge_groupe_instructeurs__dossier.dossier as dossier_id",
      "personne.id as personne_id",
    ])
    .leftJoin("edge_cap_dossier__groupe_instructeurs", {
      "edge_cap_dossier__groupe_instructeurs.cap_dossier": "cap_dossier.cap",
    })
    .leftJoin("edge_groupe_instructeurs__dossier", {
      "edge_groupe_instructeurs__dossier.groupe_instructeurs":
        "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs",
    })
    .leftJoin("personne", { "personne.access_code": "cap_dossier.personne_cap" })
    .where({
      "cap_dossier.cap": cap,
      "personne.email": personneEmail,
      "edge_groupe_instructeurs__dossier.dossier": dossierId,
    });
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
