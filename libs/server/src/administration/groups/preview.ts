import { parseGroupRules } from "@pitchou/common/groupRouting.ts";
import { createHash } from "node:crypto";
import type { Knex } from "knex";
import type { GroupPreview, GroupRule } from "@pitchou/types/groupRouting.ts";
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
      ? [{ departments: input.departments, communes: [], activites: [] }]
      : []),
    ...existing.filter((rule) => rule.communes.length > 0 || rule.activites.length > 0),
  ];
}

export async function calculatePreview(
  trx: Knex.Transaction,
  input: GroupUpdate,
): Promise<GroupPreview> {
  const rules = await resolvedRules(trx, input);
  const group = input.id ? await trx("groupe_instructeurs").where({ id: input.id }).first() : null;
  if (input.id && !group) throw new TypeError("Groupe introuvable");
  const before = input.id
    ? ((await trx("edge_groupe_instructeurs__dossier")
        .where({ groupe_instructeurs: input.id })
        .orderBy("dossier")
        .pluck("dossier")) as number[])
    : [];
  const matches = trx("dossier as d").select("d.id", "d.name").orderBy("d.id");
  if (input.active) {
    matches.whereRaw(
      `COALESCE((SELECT o.mode = 'include' FROM groupe_dossier_override o
    WHERE o.dossier = d.id AND o.groupe_instructeurs = ?::uuid), EXISTS (
      SELECT 1 FROM jsonb_to_recordset(?::jsonb) AS r(departments text[], communes text[], activites text[])
      WHERE pitchou_rule_matches(d, r.departments, r.communes, r.activites)))`,
      [input.id ?? null, JSON.stringify(rules)],
    );
  } else {
    matches.whereRaw("false");
  }
  const after = (await matches) as { id: number; name: string | null }[];
  const beforeSet = new Set(before);
  const afterSet = new Set(after.map((d) => d.id));
  const added = after.filter((d) => !beforeSet.has(d.id));
  const removed = before.filter((id) => !afterSet.has(id));
  const removedRows =
    removed.length > 0
      ? await trx("dossier").select("id", "name").whereIn("id", removed.slice(0, 100)).orderBy("id")
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
    added: { count: added.length, dossiers: added.slice(0, 100) },
    removed: { count: removed.length, dossiers: removedRows },
  };
}

export async function previewGroup(actor: UserId, input: GroupUpdate) {
  return db.transaction(async (trx) => {
    await trx.raw("select pg_advisory_xact_lock(2105102026)");
    await requireGroupManager(trx, actor);
    return calculatePreview(trx, input);
  });
}
