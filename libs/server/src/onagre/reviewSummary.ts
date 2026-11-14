import type { Knex } from "knex";
import type { DuplicateProject } from "@pitchou/types/onagreDuplicates.ts";

// Count review items, not source occurrences: several items can concern the same demande.
export async function loadReviewSummary(db: Knex) {
  const [hasTexts, hasDuplicates, hasConfirmed] = await Promise.all([
    db.schema.hasTable("onagre_comment_group"),
    db.schema.hasTable("onagre_duplicate_project"),
    db.schema.hasTable("onagre_confirmed_duplicate"),
  ]);
  const [texts, projects, decisions, confirmed] = await Promise.all([
    hasTexts
      ? db("onagre_comment_group as g")
          .leftJoin("onagre_comment_decision as d", "d.group_id", "g.id")
          .select(db.raw("coalesce(d.outcome, 'pending') as outcome"))
          .count<{ outcome: string; count: string }[]>({ count: "g.id" })
          .groupByRaw("coalesce(d.outcome, 'pending')")
      : [],
    hasDuplicates
      ? db<{ payload: DuplicateProject }>("onagre_duplicate_project").select("payload")
      : [],
    hasDuplicates ? db("onagre_duplicate_decision").select("demande_key", "outcome") : [],
    hasConfirmed
      ? db("onagre_confirmed_duplicate").count<{ count: string }>({ count: "*" }).first()
      : null,
  ]);
  const outcomes = new Map(decisions.map((d) => [d.demande_key, d.outcome]));
  let pendingDemandes = 0;
  let pendingProjects = 0;
  for (const { payload } of projects) {
    const pending = payload.demandes.filter(
      (d) => d.linkedDossierId === null && (outcomes.get(d.key) ?? "pending") === "pending",
    ).length;
    pendingDemandes += pending;
    if (pending) pendingProjects++;
  }
  return {
    texts: {
      available: hasTexts,
      total: texts.reduce((n, row) => n + Number(row.count), 0),
      pending: Number(texts.find((row) => row.outcome === "pending")?.count ?? 0),
    },
    duplicates: { available: hasDuplicates, pendingProjects, pendingDemandes },
    confirmed: Number(confirmed?.count ?? 0),
  };
}
