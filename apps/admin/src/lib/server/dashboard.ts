import { directDatabaseConnection as db } from "@pitchou/server/database/connection.ts";
import type { Permission } from "@pitchou/types/permissions.ts";
import { DEPARTEMENT_VALUES } from "./dossierValidation/columnAcceptedValues.ts";

export async function getDashboardAttention(permissions: readonly Permission[]) {
  const activityCount = db("activite_label")
    .where({ needs_review: true })
    .count("* as count")
    .first();

  // Group administration is restricted, including its dashboard summaries.
  const groupCounts = permissions.includes("groups:manage")
    ? Promise.all([
        db("dossier as d")
          .whereNotExists(
            db("edge_groupe_instructeurs__dossier as e")
              .select("e.dossier")
              .where("e.dossier", db.ref("d.id")),
          )
          .count("* as count")
          .first(),
        db("groupe_instructeurs")
          .where({ active: true, coverage_needs_review: true })
          .count("* as count")
          .first(),
        db("groupe_departement as d")
          .join("groupe_instructeurs as g", "g.id", "d.groupe_instructeurs")
          .where("g.active", true)
          .distinct("d.department"),
      ])
    : null;

  const [activities, groups] = await Promise.all([activityCount, groupCounts]);
  return {
    activityLabels: Number(activities?.count ?? 0),
    groups: groups
      ? {
          unmatchedDossiers: Number(groups[0]?.count ?? 0),
          toReview: Number(groups[1]?.count ?? 0),
          uncoveredDepartments: [...DEPARTEMENT_VALUES].filter(
            (department) => !groups[2].some((row) => row.department === department),
          ).length,
        }
      : null,
  };
}
