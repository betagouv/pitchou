import type { GroupRule } from "@pitchou/types/groupRouting.ts";
import type { Knex } from "knex";

export function splitRules(rules: GroupRule[]) {
  const simple = rules.filter((rule) => rule.communes.length === 0 && rule.activites.length === 0);
  return {
    departments: [...new Set(simple.flatMap((rule) => rule.departments))],
    conditional: rules.filter((rule) => rule.communes.length > 0 || rule.activites.length > 0),
  };
}

export async function readRules(db: Knex | Knex.Transaction, groupId: string) {
  const [departments, conditional] = await Promise.all([
    db("groupe_departement")
      .where({ groupe_instructeurs: groupId })
      .orderBy("department")
      .pluck("department"),
    db("groupe_regle").where({ groupe_instructeurs: groupId }).orderBy("id"),
  ]);
  return [
    ...(departments.length > 0 ? [{ departments, communes: [], activites: [] }] : []),
    ...conditional.map(
      ({ departments, communes, activites }) => ({ departments, communes, activites }) as GroupRule,
    ),
  ];
}

export async function replaceRules(db: Knex.Transaction, groupId: string, rules: GroupRule[]) {
  const { departments, conditional } = splitRules(rules);
  const oldIds = await db("groupe_regle").where({ groupe_instructeurs: groupId }).pluck("id");
  // Install every new rule before removing any old rule to preserve unchanged follows.
  if (departments.length > 0)
    await db("groupe_departement")
      .insert(departments.map((department) => ({ groupe_instructeurs: groupId, department })))
      .onConflict(["groupe_instructeurs", "department"])
      .ignore();
  if (conditional.length > 0)
    await db("groupe_regle").insert(
      conditional.map((rule) => ({ ...rule, groupe_instructeurs: groupId })),
    );
  await db("groupe_departement")
    .where({ groupe_instructeurs: groupId })
    .whereNotIn("department", departments)
    .delete();
  await db("groupe_regle").whereIn("id", oldIds).delete();
}
