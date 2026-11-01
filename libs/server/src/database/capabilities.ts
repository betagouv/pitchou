import { dossierAccessQuery } from "./dossier/access.ts";
import type { Knex } from "knex";
import { directDatabaseConnection } from "./connection.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PitchouInstructeurCapabilities } from "@pitchou/types/capabilities.ts";
export async function getRelationSuivis(
  dossierListCap: UserId,
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<ReturnType<PitchouInstructeurCapabilities["listFollowRelations"]>> {
  const rows = await databaseConnection("dossier")
    .select(["dossier.id as dossier", "personne.email as email"])
    .join(
      dossierAccessQuery(dossierListCap, databaseConnection).as("access"),
      "access.dossier",
      "dossier.id",
    )
    .leftJoin("edge_personne_follows_dossier", {
      "edge_personne_follows_dossier.dossier": "dossier.id",
    })
    .leftJoin("auth_user as personne", { "personne.id": "edge_personne_follows_dossier.personne" })
    .whereNotNull("email")
    .where(function () {
      this.whereNot("access.access", "lecture").orWhere("personne.id", dossierListCap);
    });
  const byEmail = new Map<string, Set<DossierId>>();
  for (const { email, dossier } of rows) {
    const dossierIds = byEmail.get(email) || new Set();
    dossierIds.add(dossier);
    byEmail.set(email, dossierIds);
  }
  return [...byEmail].map(([personneEmail, followedDossierIds]) => ({
    personneEmail,
    followedDossierIds: [...followedDossierIds],
  }));
}
