import { parseAccessLevel } from "@pitchou/common/groupRouting.ts";
import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { Knex } from "knex";
import { directDatabaseConnection as db } from "../database/connection.ts";
import { reconcileDossierAccess } from "../dossierRouting.ts";
import { dossierAccessSql } from "../dossierRouting/access.ts";
import { sharedDossierIds } from "../dossierRouting/projet.ts";
import { audit } from "./audit.ts";
import { requireGroupManager } from "./groups/access.ts";

export async function listDossierUserAccess(
  dossierId: number,
  database: Knex | Knex.Transaction = db,
) {
  if (!(await database("dossier").where({ id: dossierId }).first()))
    throw new TypeError("Dossier introuvable");
  const grants = await database("dossier_user_access as a")
    .join("auth_user as u", "u.id", "a.user_id")
    .whereIn("a.dossier", await sharedDossierIds(database, [dossierId]))
    .select("a.user_id", "u.email", "u.active")
    .select(
      database.raw(
        "CASE WHEN bool_or(a.access_level = 'instruct') THEN 'instruct' ELSE 'read' END as access_level",
      ),
    )
    .joinRaw("CROSS JOIN (SELECT ?::integer AS id) access_target", [dossierId])
    .select(database.raw(`${dossierAccessSql("access_target.id", "u.id")} as effective_access`))
    .groupBy("a.user_id", "u.id", "u.email", "u.active", "access_target.id")
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
    const members = await sharedDossierIds(trx, [dossierId]);
    const before = await trx("dossier_user_access")
      .whereIn("dossier", members)
      .where("user_id", userId);
    if (accessLevel === null)
      await trx("dossier_user_access")
        .whereIn("dossier", members)
        .where("user_id", userId)
        .delete();
    else
      await trx("dossier_user_access")
        .insert(members.map((dossier) => ({ dossier, user_id: userId, access_level: accessLevel })))
        .onConflict(["dossier", "user_id"])
        .merge();
    await reconcileDossierAccess(trx, { dossiers: [dossierId], users: [userId] });
    await audit(trx, actor, "dossier_user_access_saved", {
      ...key,
      before: members.length === 1 ? (before[0] ?? null) : before,
      after: accessLevel === null ? null : { ...key, access_level: accessLevel },
    });
    return listDossierUserAccess(dossierId, trx);
  });
}
