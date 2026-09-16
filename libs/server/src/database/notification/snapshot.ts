import type { Knex } from "knex";
import { directDatabaseConnection } from "../connection.ts";
import { getDossierFull } from "../dossier/full.ts";
import { dossierFullForReadOnly } from "../dossier/readOnly.ts";
import { dossiersAccessibleViaCap } from "../dossier/access.ts";
import { getNotificationsForPersonneFromCap } from "../notification.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";

export async function getDossierReviewSnapshot(
  dossierId: DossierFull["id"],
  cap: CapDossier["cap"],
  readOnly = false,
  db: Knex = directDatabaseConnection,
): Promise<DossierFull | undefined> {
  if (db.isTransaction)
    throw new Error("Le snapshot de revue exige sa propre transaction repeatable read.");
  return db.transaction(
    async (trx) => {
      const access = (await dossiersAccessibleViaCap(dossierId, cap, trx)).get(dossierId);
      if (!access) return undefined;
      const dossier = await getDossierFull(dossierId, cap, trx);
      if (!dossier) return undefined;
      if (readOnly || access === "lecture") return { ...dossierFullForReadOnly(dossier), access };
      const [notificationSnapshot] = await getNotificationsForPersonneFromCap(cap, trx, dossierId);
      return { ...dossier, access, notificationSnapshot };
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}
