import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DemandeRevision, DemandeVersion } from "@pitchou/types/dossierDemandes.ts";
import { dossiersAccessibleToUser } from "./dossier/access.ts";
import { getDossierFull } from "./dossier/full.ts";
import { getDossierCommentaires } from "./commentaire.ts";
import { historicalDossier } from "./demandeHistory/format.ts";
import type { DemandeState } from "./demandeHistory/state.ts";
import { directDatabaseConnection } from "./connection.ts";

export async function listDemandeRevisions(
  dossierId: DossierId,
  userId: UserId,
  db: Knex = directDatabaseConnection,
): Promise<DemandeRevision[] | undefined> {
  return db.transaction(
    async (trx) => {
      const access = (await dossiersAccessibleToUser(dossierId, userId, trx)).get(dossierId);
      if (!access || access === "lecture") return undefined;
      return trx("demande_revision")
        .where({ dossier: dossierId })
        .select("id", "recorded_at")
        .orderBy("id", "desc");
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}

export async function getDemandeVersion(
  dossierId: DossierId,
  revisionId: string | null,
  userId: UserId,
  db: Knex = directDatabaseConnection,
): Promise<DemandeVersion | undefined> {
  return db.transaction(
    async (trx) => {
      const access = (await dossiersAccessibleToUser(dossierId, userId, trx)).get(dossierId);
      if (!access || access === "lecture") return undefined;
      if (!revisionId) {
        const dossier = await getDossierFull(dossierId, userId, trx);
        if (!dossier) return undefined;
        dossier.access = access;
        delete dossier.notificationSnapshot;
        return {
          revision: null,
          dossier,
          commentaires: await getDossierCommentaires(dossierId, trx),
        };
      }
      const row:
        | { id: string; recorded_at: string; state: DemandeState; format_version: number }
        | undefined = await trx("demande_revision")
        .where({ id: revisionId, dossier: dossierId })
        .first();
      if (!row) return undefined;
      if (row.format_version !== 1) throw new Error("Version historique non prise en charge");
      return {
        revision: { id: row.id, recorded_at: row.recorded_at },
        dossier: historicalDossier(row.state, access),
        commentaires: row.state.commentaires.map(({ id, content, created_at, author_email }) => ({
          id,
          content,
          created_at,
          author_email,
        })),
      };
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}
