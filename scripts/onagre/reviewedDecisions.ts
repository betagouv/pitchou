import type { Knex } from "knex";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import { saveMapping } from "@pitchou/server/onagre/mappings.ts";

export type ReviewedDecision = {
  key: string;
  expected: Pick<
    OnagreMapping,
    "version" | "proposal" | "context" | "status" | "target" | "rule" | "notes"
  >;
  decision: { status: "review" | "discuss"; target: string; rule: string; notes: string };
};

export async function applyReviewedDecisions(
  trx: Knex.Transaction,
  entries: ReviewedDecision[],
  actorId?: number,
) {
  if (new Set(entries.map((entry) => entry.key)).size !== entries.length)
    throw new Error("Duplicate correspondence keys in the review.");
  const result = { prepared: 0, unchanged: 0, skipped: [] as string[] };
  for (const entry of entries) {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      ...entry.decision,
      key: entry.key,
      version: entry.expected.version,
    }))
      form.set(key, String(value));
    const decision = parseDecision(form);
    if (!["review", "discuss"].includes(decision.status) || !decision.target || !decision.rule)
      throw new Error(`Incomplete or already approved draft: ${entry.key}`);
    const current = await trx<OnagreMapping>("onagre_mapping")
      .where({ key: entry.key })
      .forUpdate()
      .first();
    if (
      current &&
      Object.entries(entry.decision).every(
        ([key, value]) => current[key as keyof OnagreMapping] === value,
      )
    ) {
      result.unchanged++;
      continue;
    }
    if (
      !current ||
      !["todo", "review", "discuss"].includes(current.status) ||
      !Object.entries(entry.expected).every(
        ([key, value]) => current[key as keyof OnagreMapping] === value,
      )
    ) {
      result.skipped.push(entry.key);
      continue;
    }
    if (actorId !== undefined) await saveMapping(trx, actorId, decision);
    result.prepared++;
  }
  return result;
}
