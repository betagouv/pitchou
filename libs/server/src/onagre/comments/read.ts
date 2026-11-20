import type { Knex } from "knex";
import { getReferentielRows } from "../../referentielTypeImpactMethodeMoyenDePoursuite.ts";
import {
  commentCategories,
  commentOutcomes,
  type CommentCategory,
  type CommentGroup,
  type CommentDecision,
  type CommentWorkspace,
  type CommentChoice,
} from "@pitchou/types/onagreComments.ts";
import { currentCommentCounts, hasCommentDepotDates } from "./scope.ts";

export async function loadCommentWorkspace(db: Knex, url: URL): Promise<CommentWorkspace> {
  const { category, search, outcome } = readFilters(url);
  if (!(await db.schema.hasTable("onagre_comment_group")))
    return emptyWorkspace(category, search, outcome);
  const dateScoped = await hasCommentDepotDates(db);
  const scoped = () => {
    const query = db("onagre_comment_group as g");
    if (dateScoped)
      query.join(currentCommentCounts(db).as("scope"), {
        "scope.group_id": "g.id",
        "scope.review_hash": "g.review_hash",
      });
    return query;
  };
  const base = () => {
    const query = scoped()
      .leftJoin("onagre_comment_decision as d", "d.group_id", "g.id")
      .where("g.category", category);
    if (search) query.whereILike("g.value", `%${search.replaceAll(/[\\%_]/gu, "\\$&")}%`);
    if (outcome !== "all") query.whereRaw("coalesce(d.outcome, 'pending') = ?", [outcome]);
    return query;
  };
  const [{ count }, categories, refs] = await Promise.all([
    base().count({ count: "g.id" }).first() as Promise<{ count: string }>,
    scoped()
      .select("g.category")
      .count<{ category: CommentCategory; count: string }[]>({ count: "g.id" })
      .groupBy("g.category"),
    getReferentielRows(db),
  ]);
  const total = Number(count),
    pageSize = 30;
  const requestedPage = Number(url.searchParams.get("textPage") ?? 1);
  const page = Math.min(
    Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1),
    Math.max(1, Math.ceil(total / pageSize)),
  );
  const columns = ["g.*", db.raw("to_jsonb(d) as decision")];
  if (dateScoped)
    columns.push(
      db.raw(
        "scope.demande_count::int as demande_count, scope.project_count::int as project_count",
      ),
    );
  const groups = (await base()
    .select(...columns)
    .orderBy(dateScoped ? "scope.demande_count" : "g.demande_count", "desc")
    .orderBy("g.id")
    .limit(pageSize)
    .offset((page - 1) * pageSize)) as (CommentGroup & { decision: CommentDecision | null })[];
  const selectedId = url.searchParams.get("textGroup");
  const selected = selectedId
    ? await scoped()
        .leftJoin("onagre_comment_decision as d", "d.group_id", "g.id")
        .select(...columns)
        .where("g.id", selectedId)
        .first()
    : null;
  return {
    groups,
    selected: selected ?? null,
    categories: categories.map((r) => ({
      category: r.category as CommentCategory,
      count: Number(r.count),
    })),
    total,
    page,
    pageSize,
    category,
    search,
    outcome,
    dateScoped,
    choices: referenceChoices(refs),
  };
}

function readFilters(url: URL) {
  const rawCategory = url.searchParams.get("category") ?? "cmtactivitesespeces";
  const category: CommentCategory = Object.hasOwn(commentCategories, rawCategory)
    ? (rawCategory as CommentCategory)
    : "cmtactivitesespeces";
  const search = (url.searchParams.get("text") ?? "").trim().slice(0, 200);
  const rawOutcome = url.searchParams.get("outcome") ?? "all";
  return {
    category,
    search,
    outcome: Object.hasOwn(commentOutcomes, rawOutcome) ? rawOutcome : "all",
  };
}

function emptyWorkspace(
  category: CommentCategory,
  search: string,
  outcome: string,
): CommentWorkspace {
  return {
    groups: [],
    selected: null,
    categories: [],
    total: 0,
    page: 1,
    pageSize: 30,
    category,
    search,
    outcome,
    choices: [],
  };
}

function referenceChoices(refs: Awaited<ReturnType<typeof getReferentielRows>>): CommentChoice[] {
  return [
    ...refs.typesImpact.map((r) => ({
      target: "impact_type" as const,
      classification: r.classification,
      code: r.identifiant_pitchou,
      label: r.libelle_pitchou,
    })),
    ...refs.methodes.map((r) => ({
      target: "impact_methode" as const,
      classification: r.classification,
      code: r.code,
      label: r.libelle_pitchou,
    })),
    ...refs.moyensDePoursuite.map((r) => ({
      target: "impact_moyen_de_poursuite" as const,
      classification: r.classification,
      code: r.code,
      label: r.libelle_pitchou,
    })),
  ];
}
