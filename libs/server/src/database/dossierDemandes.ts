import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierWorkspace } from "@pitchou/types/dossierDemandes.ts";
import { dossiersAccessibleToUser } from "./dossier/access.ts";
import { orderPhaseEvents } from "./phaseHistory.ts";
import { directDatabaseConnection } from "./connection.ts";
import { sharedDossierIdsSql } from "../dossierRouting/projet.ts";

export { createDemande, linkDemande } from "./dossierDemandes/write.ts";

export async function getDossierWorkspace(
  dossierId: DossierId,
  userId: UserId,
  db: Knex = directDatabaseConnection,
): Promise<DossierWorkspace | undefined> {
  return db.transaction(
    async (trx) => {
      const access = (await dossiersAccessibleToUser(dossierId, userId, trx)).get(dossierId);
      if (!access) return undefined;
      const projet = await trx("dossier_demande as m")
        .join("dossier_projet as p", "p.id", "m.projet")
        .where("m.dossier", dossierId)
        .select("p.id", "p.name")
        .first();
      const demandes = await trx("dossier as d")
        .leftJoin("dossier_demande as m", "m.dossier", "d.id")
        .whereRaw(`d.id IN (${sharedDossierIdsSql("?::integer")})`, [dossierId, dossierId])
        .select("d.id", trx.raw("coalesce(m.label, d.name, 'Demande') as label"))
        .select(
          trx("evenement_phase_dossier")
            .select("phase")
            .whereRaw("dossier = d.id")
            .modify(orderPhaseEvents)
            .limit(1)
            .as("phase"),
        )
        .orderBy("d.id");
      return {
        access,
        projet: projet ?? null,
        demandes: demandes.map((demande) => ({
          ...demande,
          phase: demande.phase ?? "Accompagnement amont",
        })),
      };
    },
    { isolationLevel: "repeatable read", readOnly: true },
  );
}
