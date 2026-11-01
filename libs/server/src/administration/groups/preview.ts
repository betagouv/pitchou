import { parseGroupRules } from "@pitchou/common/groupRouting.ts";
import { createHash } from "node:crypto";
import type { Knex } from "knex";
import type { AccessLevel, GroupPreview, GroupRule } from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { directDatabaseConnection as db } from "../../database/connection.ts";
import { requireGroupManager } from "./access.ts";
import { readRules } from "./rules.ts";
import type { GroupUpdate } from "../groups.ts";

export async function resolvedRules(
  trx: Knex.Transaction,
  input: GroupUpdate,
): Promise<GroupRule[]> {
  if (input.rules) {
    const rules = parseGroupRules(input.rules);
    const codes = [...new Set(rules.flatMap((rule) => rule.activites))];
    const existing = await trx("activite").whereIn("code", codes).pluck("code");
    if (existing.length !== codes.length) throw new TypeError("Activité inconnue");
    return rules;
  }
  const existing = input.id ? await readRules(trx, input.id) : [];
  return [
    ...(input.departments.length > 0
      ? [
          {
            departments: input.departments,
            communes: [],
            activites: [],
            accessLevel: "instruct" as const,
          },
        ]
      : []),
    ...existing.filter(
      (rule) =>
        rule.communes.length > 0 || rule.activites.length > 0 || rule.accessLevel === "read",
    ),
  ];
}

async function proposedAssignments(trx: Knex.Transaction, input: GroupUpdate, rules: GroupRule[]) {
  const matches = trx("dossier as d")
    .select("d.id", "d.name")
    .select(
      trx.raw(
        `CASE WHEN ?::boolean THEN COALESCE(
      (SELECT CASE WHEN o.mode = 'include' THEN o.access_level ELSE 'none' END
       FROM groupe_dossier_override o WHERE o.dossier = d.id AND o.groupe_instructeurs = ?::uuid),
      (SELECT CASE WHEN bool_or(r."accessLevel" = 'instruct') THEN 'instruct' ELSE 'read' END
       FROM jsonb_to_recordset(?::jsonb) AS r(departments text[], communes text[], activites text[], "accessLevel" text)
       WHERE pitchou_rule_matches(d, r.departments, r.communes, r.activites)
       HAVING count(*) > 0)
    ) END AS access_level`,
        [
          input.active,
          input.id ?? null,
          JSON.stringify(
            rules.map((rule) => ({ ...rule, accessLevel: rule.accessLevel ?? "instruct" })),
          ),
        ],
      ),
    )
    .orderBy("d.id");
  return (
    (await matches) as {
      id: number;
      name: string | null;
      access_level: AccessLevel | "none" | null;
    }[]
  ).filter((d) => d.access_level && d.access_level !== "none");
}

export async function calculatePreview(
  trx: Knex.Transaction,
  input: GroupUpdate,
): Promise<GroupPreview> {
  const rules = await resolvedRules(trx, input);
  const group = input.id ? await trx("groupe_instructeurs").where({ id: input.id }).first() : null;
  if (input.id && !group) throw new TypeError("Groupe introuvable");
  const before = input.id
    ? await trx("edge_groupe_instructeurs__dossier")
        .where({ groupe_instructeurs: input.id })
        .select("dossier", "access_level")
        .orderBy("dossier")
    : [];
  const after = await proposedAssignments(trx, input, rules);
  const beforeMap = new Map(before.map((d) => [d.dossier, d.access_level]));
  const afterSet = new Set(after.map((d) => d.id));
  const added = after.filter((d) => !beforeMap.has(d.id));
  const removed = before.filter((d) => !afterSet.has(d.dossier));
  const upgraded = after.filter(
    (d) => beforeMap.get(d.id) === "read" && d.access_level === "instruct",
  );
  const downgraded = after.filter(
    (d) => beforeMap.get(d.id) === "instruct" && d.access_level === "read",
  );
  const summarize = (rows: { id: number; name: string | null }[]) => ({
    count: rows.length,
    dossiers: rows.slice(0, 100).map(({ id, name }) => ({ id, name })),
  });
  const removedRows =
    removed.length > 0
      ? await trx("dossier")
          .select("id", "name")
          .whereIn(
            "id",
            removed.slice(0, 100).map((d) => d.dossier),
          )
          .orderBy("id")
      : [];
  const state = input.id
    ? {
        group,
        rules: await readRules(trx, input.id),
        members: await trx("user_groupe")
          .where({ groupe_instructeurs: input.id })
          .orderBy("user_id")
          .pluck("user_id"),
      }
    : null;
  const token = createHash("sha256")
    .update(JSON.stringify({ input: { ...input, previewToken: undefined }, state, before, after }))
    .digest("hex");
  return {
    token,
    added: summarize(added),
    removed: { count: removed.length, dossiers: removedRows },
    upgraded: summarize(upgraded),
    downgraded: summarize(downgraded),
  };
}

export async function previewGroup(actor: UserId, input: GroupUpdate) {
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupManager(trx, actor);
    return calculatePreview(trx, input);
  });
}
