import type { Knex } from "knex";
import type { CommentGroup } from "@pitchou/types/onagreComments.ts";
import type { CommentEvidence, CommentExplanation } from "@pitchou/types/onagreCommentEvidence.ts";
import { explainOccurrences } from "./explanations.ts";

export async function loadCommentEvidence(
  db: Knex,
  group: CommentGroup,
  keys: string[],
): Promise<Map<string, CommentExplanation[]>> {
  // An inventory hash change invalidates the associated evidence, never a team's decision.
  if (!(await db.schema.hasTable("onagre_comment_evidence"))) return new Map();
  const rows: { demande_key: string; occurrences: CommentEvidence[] }[] = await db(
    "onagre_comment_evidence",
  )
    .select("demande_key", "occurrences")
    .where({ group_id: group.id, review_hash: group.review_hash })
    .whereIn("demande_key", keys);
  return new Map(rows.map((row) => [row.demande_key, explainOccurrences(group, row.occurrences)]));
}
