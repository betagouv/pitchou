import { directDatabaseConnection as db } from "../database/connection.ts";
import { requireGroupManager } from "./groups/access.ts";
import { replaceRules, readRules } from "./groups/rules.ts";
import { calculatePreview, resolvedRules } from "./groups/preview.ts";
import type { GroupRule } from "@pitchou/types/groupRouting.ts";
import type GroupeInstructeurs from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type AuthUser from "@pitchou/types/database/public/AuthUser.ts";
import { audit } from "./audit.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
type ManagedGroup = GroupeInstructeurs & {
  departments: string[];
  rules: GroupRule[];
  members: number[];
  dossierCount: number;
};

export async function listGroups(): Promise<{
  groups: ManagedGroup[];
  users: Pick<AuthUser, "id" | "email" | "active">[];
}> {
  const [groups, departments, members, counts, users, rules] = await Promise.all([
    db("groupe_instructeurs").orderBy("name"),
    db("groupe_departement"),
    db("user_groupe"),
    db("edge_groupe_instructeurs__dossier")
      .select("groupe_instructeurs")
      .count("dossier as count")
      .groupBy("groupe_instructeurs"),
    db("auth_user").select("id", "email", "active").orderBy("email"),
    db("groupe_regle").orderBy("id"),
  ]);
  return {
    groups: groups.map((g) => ({
      ...g,
      departments: departments
        .filter((d) => d.groupe_instructeurs === g.id)
        .map((d) => d.department),
      rules: [
        ...(departments.some((d) => d.groupe_instructeurs === g.id)
          ? [
              {
                departments: departments
                  .filter((d) => d.groupe_instructeurs === g.id)
                  .map((d) => d.department),
                communes: [],
                activites: [],
              },
            ]
          : []),
        ...rules
          .filter((r) => r.groupe_instructeurs === g.id)
          .map(
            ({ departments, communes, activites }) =>
              ({ departments, communes, activites }) as GroupRule,
          ),
      ] as GroupRule[],
      members: members.filter((m) => m.groupe_instructeurs === g.id).map((m) => m.user_id),
      dossierCount: Number(counts.find((c) => c.groupe_instructeurs === g.id)?.count ?? 0),
    })),
    users,
  };
}

export type GroupUpdate = {
  id?: string;
  name: string;
  active: boolean;
  departments: string[];
  members: number[];
  rules?: GroupRule[];
  previewToken?: string;
};
export async function saveGroup(actor: UserId, input: GroupUpdate) {
  if (!input.name.trim()) throw new TypeError("Le nom du groupe est requis");
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    const before = input.id
      ? await trx("groupe_instructeurs").where({ id: input.id }).first()
      : null;
    await requireGroupManager(trx, actor);
    if (input.id && !before) throw new TypeError("Groupe introuvable");
    if (input.previewToken && input.previewToken !== (await calculatePreview(trx, input)).token)
      throw new TypeError(
        "Les affectations ont changé. Vérifiez un nouvel aperçu avant d’enregistrer.",
      );
    const rules = await resolvedRules(trx, input);
    if (before) {
      before.rules = await readRules(trx, before.id);
      before.departments = await trx("groupe_departement")
        .where({ groupe_instructeurs: before.id })
        .pluck("department");
      before.members = await trx("user_groupe")
        .where({ groupe_instructeurs: before.id })
        .pluck("user_id");
    }
    const values = { name: input.name.trim(), active: input.active, coverage_needs_review: false };
    const [group] = before
      ? await trx("groupe_instructeurs").where({ id: input.id }).update(values).returning("*")
      : await trx("groupe_instructeurs").insert(values).returning("*");
    await replaceRules(trx, group.id, rules);
    if (input.members.length > 0)
      await trx("user_groupe")
        .insert(
          [...new Set(input.members)].map((user_id) => ({
            groupe_instructeurs: group.id,
            user_id,
          })),
        )
        .onConflict(["user_id", "groupe_instructeurs"])
        .ignore();
    await trx("user_groupe")
      .where({ groupe_instructeurs: group.id })
      .whereNotIn("user_id", input.members)
      .delete();
    await audit(trx, actor, "group_saved", {
      id: group.id,
      before,
      after: { ...input, rules, previewToken: undefined },
    });
    return group;
  });
}
