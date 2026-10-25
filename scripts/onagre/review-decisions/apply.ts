import type { Knex } from "../../../libs/database/node_modules/knex/types/index.d.ts";
import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import { originalContexts, originalWorkbook } from "@pitchou/common/onagre/originalWorkbook.ts";
import { parseDecision } from "@pitchou/server/onagre/validation.ts";
import { saveMapping } from "@pitchou/server/onagre/mappings.ts";
import { validateActivityChoice } from "@pitchou/server/onagre/activities/validation.ts";
import type { DecisionReview, ReviewEntry } from "./types.ts";

function parseEntry(entry: ReviewEntry) {
  if (!entry.evidence || ["validated", "excluded"].includes(entry.expected.status))
    throw new Error(`Review cannot replace an existing decision: ${entry.key}`);
  if (entry.origin === "schema-inference") {
    if (entry.expected.status !== "todo" || !["review", "discuss"].includes(entry.decision.status))
      throw new Error(`Inferences must remain drafts: ${entry.key}`);
  } else if (entry.origin === "workbook") {
    const original = originalContexts[entry.key];
    if (!original?.proposal || original.proposal !== entry.expected.proposal)
      throw new Error(`Workbook proposal differs: ${entry.key}`);
    if (original.confidence !== entry.expected.confidence)
      throw new Error(`Workbook confidence differs: ${entry.key}`);
  } else throw new Error("Unknown review origin");
  const form = new FormData();
  for (const [key, value] of Object.entries({
    ...entry.decision,
    key: entry.key,
    version: entry.expected.version,
  }))
    form.set(key, String(value));
  const parsed = parseDecision(form);
  if (!parsed.target || !parsed.rule) throw new Error(`Incomplete review: ${entry.key}`);
  return parsed;
}

export async function applyDecisionReview(
  trx: Knex.Transaction,
  review: DecisionReview,
  actorId?: number,
) {
  if (
    review.format !== "pitchou-onagre-decision-review-v1" ||
    review.workbookFingerprint !== originalWorkbook.fingerprint ||
    new Set(review.entries.map((entry) => entry.key)).size !== review.entries.length
  )
    throw new Error("Invalid decision review");
  const snapshot = await trx("onagre_snapshot")
    .where({
      fingerprint: review.snapshotFingerprint,
      workbook_fingerprint: review.workbookFingerprint,
    })
    .first("id");
  if (!snapshot) throw new Error("The reviewed source snapshot is absent");
  if (
    actorId !== undefined &&
    !(await trx("auth_user").where({ id: actorId, active: true }).first())
  )
    throw new Error("Review actor is not active");
  const result = { changed: [] as string[], unchanged: [] as string[], skipped: [] as string[] };
  for (const entry of review.entries) {
    const decision = parseEntry(entry);
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
      result.unchanged.push(entry.key);
      continue;
    }
    if (
      !current ||
      !Object.entries(entry.expected).every(
        ([key, value]) => current[key as keyof OnagreMapping] === value,
      )
    ) {
      result.skipped.push(entry.key);
      continue;
    }
    await validateActivityChoice(trx, current, decision);
    if (actorId !== undefined) await saveMapping(trx, actorId, decision);
    result.changed.push(entry.key);
  }
  return result;
}
