import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossiersExportScope, ExportDossier } from "@pitchou/types/dossierExport.ts";
import { directDatabaseConnection } from "../../database.ts";
import { getSessionUser } from "../../users.ts";
import { dossierAccessQuery } from "./access.ts";
import { exportDossiersQuery, exportRelationsQueries } from "./export/queries.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import { isOfficialAvisExpert } from "@pitchou/common/avisExpert.ts";

function groupBy<T, K>(values: T[], key: (value: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const value of values) {
    const k = key(value);
    const group = result.get(k) ?? [];
    group.push(value);
    result.set(k, group);
  }
  return result;
}

export async function getDossiersForExport(
  userId: UserId,
  scope: DossiersExportScope,
  selectedIds: DossierId[],
  db: Knex = directDatabaseConnection,
): Promise<ExportDossier[] | undefined> {
  return db.transaction(
    async (trx) => {
      const user = await getSessionUser(userId, trx);
      if (!user?.groupes.length || !user.permissions.includes("dossier:read")) return undefined;
      const ids = trx("dossier")
        .select("dossier.id")
        .join(
          dossierAccessQuery(userId, trx).as("dossier_access"),
          "dossier_access.dossier",
          "dossier.id",
        )
        .whereIn("dossier.id", selectedIds);
      if (scope !== "france") ids.where("dossier_access.access", "complet");
      if (scope === "followed") {
        ids.whereExists(
          trx("edge_personne_follows_dossier")
            .select("dossier")
            .whereRaw("edge_personne_follows_dossier.dossier = dossier.id")
            .where("personne", userId),
        );
      }
      const dossiers = await exportDossiersQuery(ids, trx);
      const relations = await exportRelationsQueries(ids, trx);
      const followers = groupBy(relations.followers, (row) => row.dossier);
      const especes = groupBy(relations.especes, (row) => row.dossier);
      const avis = groupBy(relations.avis, (row) => row.dossier);
      const decisions = groupBy(relations.decisions, (row) => row.dossier);
      const prescriptions = groupBy(relations.prescriptions, (row) => row.dossier);
      const controles = groupBy(relations.controles, (row) => row.prescription);
      return dossiers.map((dossier) => ({
        ...dossier,
        readOnly: scope === "france",
        followers:
          scope === "france" ? [] : (followers.get(dossier.id) ?? []).map(({ email }) => email),
        especes: especes.get(dossier.id) ?? [],
        avis:
          scope === "france"
            ? (avis.get(dossier.id) ?? [])
                .filter(({ expert }) => isOfficialAvisExpert(expert))
                .map((entry) => ({ ...entry, saisine_date: null, saisine_fichier: null }))
            : (avis.get(dossier.id) ?? []),
        decisions: decisions.get(dossier.id) ?? [],
        prescriptions:
          scope === "france"
            ? []
            : (prescriptions.get(dossier.id) ?? []).map(({ id }) => ({
                controles: controles.get(id) ?? [],
              })),
      }));
    },
    { readOnly: true, isolationLevel: "repeatable read" },
  );
}
