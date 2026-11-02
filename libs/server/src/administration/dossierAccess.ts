import type { Knex } from "knex";
import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { parseAccessLevel } from "@pitchou/common/groupRouting.ts";
import { directDatabaseConnection as db } from "../database/connection.ts";
import { requireGroupManager } from "./groups/access.ts";
import { audit } from "./audit.ts";

export async function listDossierUserAccess(
  dossierId: number,
  database: Knex | Knex.Transaction = db,
) {
  if (!(await database("dossier").where({ id: dossierId }).first()))
    throw new TypeError("Dossier introuvable");
  const grants = await database("dossier_user_access as a")
    .join("auth_user as u", "u.id", "a.user_id")
    .where("a.dossier", dossierId)
    .select("a.user_id", "a.access_level", "u.email", "u.active")
    .select(database.raw("pitchou_dossier_access(?, u.id) as effective_access", [dossierId]))
    .orderBy("u.email");
  const users = await database("auth_user").select("id", "email", "active").orderBy("email");
  return { grants, users };
}

export async function saveDossierUserAccess(
  actor: UserId,
  dossierId: number,
  userId: number,
  accessLevel: AccessLevel | null,
) {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new TypeError("Utilisateur invalide");
  if (accessLevel !== null) parseAccessLevel(accessLevel);
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupManager(trx, actor);
    if (!(await trx("dossier").where({ id: dossierId }).first()))
      throw new TypeError("Dossier introuvable");
    if (!(await trx("auth_user").where({ id: userId }).first()))
      throw new TypeError("Utilisateur introuvable");
    const key = { dossier: dossierId, user_id: userId };
    const before = await trx("dossier_user_access").where(key).first();
    if (accessLevel === null) await trx("dossier_user_access").where(key).delete();
    else
      await trx("dossier_user_access")
        .insert({ ...key, access_level: accessLevel })
        .onConflict(["dossier", "user_id"])
        .merge();
    await audit(trx, actor, "dossier_user_access_saved", {
      ...key,
      before: before ?? null,
      after: accessLevel === null ? null : { ...key, access_level: accessLevel },
    });
    return listDossierUserAccess(dossierId, trx);
  });
}
