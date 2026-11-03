import type { GroupRule } from "@pitchou/types/groupRouting.ts";
import type { Knex } from "knex";

export function splitRules(rules: GroupRule[]) {
  const isSimple = (rule: GroupRule) =>
    rule.communes.length === 0 && rule.activites.length === 0 && rule.accessLevel !== "read";
  const simple = rules.filter(isSimple);
  return {
    departments: [...new Set(simple.flatMap((rule) => rule.departments))],
    conditional: rules.filter((rule) => !isSimple(rule)),
  };
}

export async function readRules(db: Knex | Knex.Transaction, groupId: string) {
  const departments = await db("groupe_departement")
    .where({ groupe_instructeurs: groupId })
    .orderBy("department")
    .pluck("department");
  const conditional = await db("group_routing_rule")
    .where({ groupe_instructeurs: groupId })
    .orderBy("id");
  return [
    ...(departments.length > 0
      ? [{ departments, communes: [], activites: [], accessLevel: "instruct" as const }]
      : []),
    ...conditional.map(
      ({ departments, communes, activites, access_level }) =>
        ({ departments, communes, activites, accessLevel: access_level }) as GroupRule,
    ),
  ];
}

export async function replaceRules(db: Knex.Transaction, groupId: string, rules: GroupRule[]) {
  const { departments, conditional } = splitRules(rules);
  const oldIds = await db("group_routing_rule").where({ groupe_instructeurs: groupId }).pluck("id");
  // Install every new rule before removing any old rule to preserve unchanged follows.
  if (departments.length > 0)
    await db("groupe_departement")
      .insert(departments.map((department) => ({ groupe_instructeurs: groupId, department })))
      .onConflict(["groupe_instructeurs", "department"])
      .ignore();
  if (conditional.length > 0)
    await db("group_routing_rule").insert(
      conditional.map(({ accessLevel = "instruct", ...rule }) => ({
        ...rule,
        access_level: accessLevel,
        groupe_instructeurs: groupId,
      })),
    );
  await db("groupe_departement")
    .where({ groupe_instructeurs: groupId })
    .whereNotIn("department", departments)
    .delete();
  await db("group_routing_rule").whereIn("id", oldIds).delete();
}
