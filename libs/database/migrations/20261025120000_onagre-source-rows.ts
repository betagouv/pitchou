import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("onagre_snapshot", (table) => {
    table.boolean("records_complete").notNullable().defaultTo(false);
  });
  await knex.schema.createTable("onagre_source_row", (table) => {
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.text("table_name").notNullable();
    table.integer("row_number").notNullable();
    table.jsonb("content").notNullable();
    table.primary(["snapshot_id", "table_name", "row_number"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("onagre_source_row");
  await knex.schema.alterTable("onagre_snapshot", (table) => table.dropColumn("records_complete"));
}
