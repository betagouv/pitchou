import type { Knex } from "knex";
import { directDatabaseConnection } from "../connection.ts";
import { getDossierFull } from "../dossier/full.ts";
import { dossierFullForReadOnly } from "../dossier/readOnly.ts";
import { dossiersAccessibleToUser } from "../dossier/access.ts";
import { getNotificationsForUser } from "../notification.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { UserId } from "@pitchou/types/permissions.ts";

export async function getDossierReviewSnapshot(
  dossierId: DossierFull["id"],
  userId: UserId,
  readOnly = false,
  db: Knex = directDatabaseConnection,
): Promise<DossierFull | undefined> {
  if (db.isTransaction)
    throw new Error("Le snapshot de revue exige sa propre transaction repeatable read.");
  return db.transaction(
    async (trx) => {
      const access = (await dossiersAccessibleToUser(dossierId, userId, trx)).get(dossierId);
      if (!access) return undefined;
      const dossier = await getDossierFull(dossierId, userId, trx);
      if (!dossier) return undefined;
      if (readOnly || access === "lecture") return { ...dossierFullForReadOnly(dossier), access };
      const [notificationSnapshot] = await getNotificationsForUser(userId, trx, dossierId);
      return { ...dossier, access, notificationSnapshot };
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}
