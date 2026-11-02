import { parseGroupRules } from "@pitchou/common/groupRouting.ts";
import { createHash } from "node:crypto";
import type { Knex } from "knex";
import {
  GROUP_PREVIEW_PAGE_SIZE,
  type GroupPreview,
  type GroupPreviewPage,
  type GroupRule,
  type PreviewCategory,
} from "@pitchou/types/groupRouting.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import { directDatabaseConnection as db } from "../../database/connection.ts";
import { requireGroupManager } from "./access.ts";
import { readRules } from "./rules.ts";
import type { GroupUpdate } from "../groups.ts";
import { queryPreview } from "./preview/query.ts";
import {
  StaleGroupPreviewError,
  validatePreviewPage,
  type PreviewPageRequest,
} from "./preview/pagination.ts";

export { parsePreviewPage, StaleGroupPreviewError } from "./preview/pagination.ts";

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

async function calculateSnapshot(
  trx: Knex.Transaction,
  input: GroupUpdate,
  page?: PreviewPageRequest,
): Promise<GroupPreview> {
  const rules = await resolvedRules(trx, input);
  const group = input.id ? await trx("groupe_instructeurs").where({ id: input.id }).first() : null;
  if (input.id && !group) throw new TypeError("Groupe introuvable");
  const categories = await queryPreview(trx, input, rules, page);
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
    .update(
      JSON.stringify({
        input: { ...input, previewToken: undefined },
        state,
        assignments: categories[0].digest,
      }),
    )
    .digest("hex");
  const summary = (category: PreviewCategory) => {
    const result = categories.find((result) => result.category === category)!;
    return { count: Number(result.count), dossiers: result.dossiers };
  };
  return {
    token,
    added: summary("added"),
    removed: summary("removed"),
    upgraded: summary("upgraded"),
    downgraded: summary("downgraded"),
  };
}

export async function calculatePreview(trx: Knex.Transaction, input: GroupUpdate) {
  return calculateSnapshot(trx, input);
}

export function previewGroup(actor: UserId, input: GroupUpdate): Promise<GroupPreview>;
export function previewGroup(
  actor: UserId,
  input: GroupUpdate,
  page: PreviewPageRequest,
): Promise<GroupPreviewPage>;
export async function previewGroup(
  actor: UserId,
  input: GroupUpdate,
  page?: PreviewPageRequest,
): Promise<GroupPreview | GroupPreviewPage> {
  if (page) validatePreviewPage(page);
  return db.transaction(
    async (trx) => {
      await trx.raw("select pg_advisory_xact_lock(2105102026)");
      await requireGroupManager(trx, actor);
      const preview = await calculateSnapshot(trx, input, page);
      if (!page) return preview;
      if (page.token !== preview.token) throw new StaleGroupPreviewError();
      const category = preview[page.category];
      if (page.page > Math.max(1, Math.ceil(category.count / GROUP_PREVIEW_PAGE_SIZE)))
        throw new TypeError("Cette page n'existe pas dans l'aperçu");
      return {
        token: preview.token,
        ...category,
        page: page.page,
        pageSize: GROUP_PREVIEW_PAGE_SIZE,
      };
    },
    // Read committed rechecks authorization after a queued advisory lock is acquired.
    // Counts, digest and dossier pages share one SQL statement snapshot.
    { readOnly: true },
  );
}
