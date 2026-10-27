import type { AssignmentMode, GroupAssignment, GroupRule } from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { Knex } from "knex";
import { directDatabaseConnection as db } from "../../database/connection.ts";
import { requireGroupManager } from "./access.ts";
import { audit } from "../audit.ts";

export async function listDossierAssignments(
  dossierId: number,
  database: Knex | Knex.Transaction = db,
): Promise<GroupAssignment[]> {
  const dossier = await database("dossier").where({ id: dossierId }).first();
  if (!dossier) throw new TypeError("Dossier introuvable");
  const [groups, rules, departments] = await Promise.all([
    database("groupe_instructeurs as g")
      .leftJoin("groupe_dossier_override as o", (join) =>
        join.on("o.groupe_instructeurs", "g.id").andOnVal("o.dossier", dossierId),
      )
      .select("g.id", "g.name", "g.active", "o.mode")
      .select(
        database.raw(
          "pitchou_group_matches(d, g.id) as automatic, pitchou_group_owns(d, g.id) as assigned",
        ),
      )
      .joinRaw("CROSS JOIN dossier d")
      .where("d.id", dossierId)
      .orderBy("g.name"),
    database("groupe_regle as r")
      .select("r.*")
      .joinRaw("CROSS JOIN dossier d")
      .where("d.id", dossierId)
      .whereRaw("pitchou_rule_matches(d, r.departments, r.communes, r.activites)"),
    database("groupe_departement").where({ department: dossier.primary_department ?? "" }),
  ]);
  return groups.map((group) => ({
    ...group,
    mode: group.mode ?? "auto",
    departments: departments
      .filter((d) => d.groupe_instructeurs === group.id)
      .map((d) => d.department),
    rules: rules
      .filter((r) => r.groupe_instructeurs === group.id)
      .map(
        ({ departments, communes, activites }) =>
          ({ departments, communes, activites }) as GroupRule,
      ),
  })) as GroupAssignment[];
}

export async function saveDossierAssignment(
  actor: UserId,
  dossierId: number,
  groupId: string,
  mode: AssignmentMode,
) {
  if (!["auto", "include", "exclude"].includes(mode)) throw new TypeError("Affectation invalide");
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupManager(trx, actor);
    if (!(await trx("dossier").where({ id: dossierId }).first()))
      throw new TypeError("Dossier introuvable");
    if (!(await trx("groupe_instructeurs").where({ id: groupId }).first()))
      throw new TypeError("Groupe introuvable");
    const key = { dossier: dossierId, groupe_instructeurs: groupId };
    const before = await trx("groupe_dossier_override").where(key).first();
    if (mode === "auto") await trx("groupe_dossier_override").where(key).delete();
    else
      await trx("groupe_dossier_override")
        .insert({ ...key, mode })
        .onConflict(["groupe_instructeurs", "dossier"])
        .merge();
    await audit(trx, actor, "dossier_assignment_saved", {
      ...key,
      before: before?.mode ?? "auto",
      after: mode,
    });
    return listDossierAssignments(dossierId, trx);
  });
}
