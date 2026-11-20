import type { Knex } from "knex";

export const firstCommentDepotDate = "2023-01-01";

export async function hasCommentDepotDates(db: Knex): Promise<boolean> {
  return (
    (await db.schema.hasTable("onagre_comment_demande")) &&
    Boolean(await db("onagre_comment_demande").select("demande_key").first())
  );
}

export function currentCommentEvidence(db: Knex) {
  return db("onagre_comment_evidence as e")
    .join("onagre_comment_demande as date", "e.demande_key", "date.demande_key")
    .where((query) =>
      query
        .whereNull("date.ddep_depot_date")
        .orWhere("date.ddep_depot_date", ">=", firstCommentDepotDate),
    );
}

export function currentCommentCounts(db: Knex) {
  return currentCommentEvidence(db)
    .select("e.group_id", "e.review_hash")
    .count({ demande_count: "e.demande_key" })
    .countDistinct({ project_count: "date.source_project_id" })
    .groupBy("e.group_id", "e.review_hash");
}
