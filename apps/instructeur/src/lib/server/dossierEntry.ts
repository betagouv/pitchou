import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { dossierAccessQuery } from "@pitchou/server/database/dossier/access.ts";
import type { SessionUser } from "@pitchou/types/permissions.ts";

/** Direct dossier grants also let a user enter the instructeur application. */
export async function canReadDossiers(user: SessionUser | null | undefined): Promise<boolean> {
  if (!user?.active || !user.permissions.includes("dossier:read")) return false;
  if (user.groupes.length > 0) return true;
  return Boolean(await dossierAccessQuery(user.id, db).first());
}
