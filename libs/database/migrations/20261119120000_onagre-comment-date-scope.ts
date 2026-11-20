import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_comment_demande", (table) => {
    table.text("demande_key").primary();
    table.text("source_project_id").notNullable();
    table.date("ddep_depot_date");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_comment_demande");
}
