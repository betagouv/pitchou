import { parseAccessLevel } from "@pitchou/common/groupRouting.ts";
import type {
  AccessLevel,
  AssignmentMode,
  GroupAssignment,
  GroupRule,
} from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { Knex } from "knex";
import { directDatabaseConnection as db } from "../../database/connection.ts";
import { recalculateAssignments } from "../../dossierRouting.ts";
import { groupAccessSql, groupMatchesSql, ruleMatchesSql } from "../../dossierRouting/sql.ts";
import { audit } from "../audit.ts";
import { requireGroupManager } from "./access.ts";
import { sharedDossierIds } from "../../dossierRouting/projet.ts";

export async function listDossierAssignments(
  dossierId: number,
  database: Knex | Knex.Transaction = db,
): Promise<GroupAssignment[]> {
  const dossier = await database("dossier").where({ id: dossierId }).first();
  if (!dossier) throw new TypeError("Dossier introuvable");
  const members = await sharedDossierIds(database, [dossierId]);
  const groups = await database("groupe_instructeurs as g")
    .leftJoin("dossier_group_override as o", (join) =>
      join.on("o.groupe_instructeurs", "g.id").andOnVal("o.dossier", dossierId),
    )
    .select("g.id", "g.name", "g.active", "o.mode", "o.access_level as manualAccessLevel")
    .select(
      database.raw(
        ` ${groupMatchesSql()} as automatic, ${groupAccessSql()} IS NOT NULL as assigned, ${groupAccessSql()} as "accessLevel"`,
      ),
    )
    .joinRaw("CROSS JOIN dossier d")
    .where("d.id", dossierId)
    .orderBy("g.name");
  const rules = await database("group_routing_rule as r")
    .distinct("r.*")
    .joinRaw("CROSS JOIN dossier d")
    .whereIn("d.id", members)
    .whereRaw(ruleMatchesSql());
  const departments = await database("groupe_departement").whereIn(
    "department",
    database("dossier").select("primary_department").whereIn("id", members),
  );
  return groups.map((group) => ({
    ...group,
    mode: group.mode ?? "auto",
    manualAccessLevel: group.manualAccessLevel ?? "instruct",
    departments: departments
      .filter((d) => d.groupe_instructeurs === group.id)
      .map((d) => d.department),
    rules: rules
      .filter((r) => r.groupe_instructeurs === group.id)
      .map(
        ({ departments, communes, activites, access_level }) =>
          ({ departments, communes, activites, accessLevel: access_level }) as GroupRule,
      ),
  })) as GroupAssignment[];
}

export async function saveDossierAssignment(
  actor: UserId,
  dossierId: number,
  groupId: string,
  mode: AssignmentMode,
  accessLevel: AccessLevel = "instruct",
) {
  if (!["auto", "include", "exclude"].includes(mode)) throw new TypeError("Affectation invalide");
  parseAccessLevel(accessLevel);
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupManager(trx, actor);
    if (!(await trx("dossier").where({ id: dossierId }).first()))
      throw new TypeError("Dossier introuvable");
    if (!(await trx("groupe_instructeurs").where({ id: groupId }).first()))
      throw new TypeError("Groupe introuvable");
    const key = { dossier: dossierId, groupe_instructeurs: groupId };
    const members = await sharedDossierIds(trx, [dossierId]);
    const before = await trx("dossier_group_override")
      .whereIn("dossier", members)
      .where("groupe_instructeurs", groupId);
    if (mode === "auto")
      await trx("dossier_group_override")
        .whereIn("dossier", members)
        .where("groupe_instructeurs", groupId)
        .delete();
    else
      await trx("dossier_group_override")
        .insert(
          members.map((dossier) => ({
            dossier,
            groupe_instructeurs: groupId,
            mode,
            access_level: accessLevel,
          })),
        )
        .onConflict(["groupe_instructeurs", "dossier"])
        .merge();
    await recalculateAssignments(trx, { dossiers: [dossierId] });
    await audit(trx, actor, "dossier_assignment_saved", {
      ...key,
      before: members.length === 1 ? (before[0] ?? { mode: "auto" }) : before,
      after: mode === "auto" ? { mode } : { mode, access_level: accessLevel },
    });
    return listDossierAssignments(dossierId, trx);
  });
}
