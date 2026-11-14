import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_comment_evidence", (table) => {
    table.text("group_id").notNullable().references("id").inTable("onagre_comment_group");
    table.text("demande_key").notNullable();
    table.text("review_hash").notNullable();
    table.jsonb("occurrences").notNullable();
    table.jsonb("provenance").notNullable();
    table.text("evidence_hash").notNullable();
    table.primary(["group_id", "demande_key"]);
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_comment_evidence");
}
