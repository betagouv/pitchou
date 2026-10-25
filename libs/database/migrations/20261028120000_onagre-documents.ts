import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("onagre_document", (table) => {
    table.increments("id");
    table.text("filename").notNullable();
    table.string("fingerprint", 64).notNullable();
    table.bigInteger("size").notNullable();
    table.text("mime").notNullable();
    table.jsonb("review").notNullable();
    table.integer("snapshot_id").references("id").inTable("onagre_snapshot");
    table.binary("original");
    table.text("text");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["filename", "fingerprint"]);
  });
  await knex.schema.createTable("onagre_document_sheet", (table) => {
    table.integer("document_id").notNullable().references("id").inTable("onagre_document");
    table.integer("sheet_index").notNullable();
    table.text("name").notNullable();
    table.integer("row_count").notNullable();
    table.jsonb("columns").notNullable();
    table.primary(["document_id", "sheet_index"]);
  });
  await knex.schema.createTable("onagre_document_row", (table) => {
    table.integer("document_id").notNullable();
    table.integer("sheet_index").notNullable();
    table.integer("row_number").notNullable();
    table.jsonb("cells").notNullable();
    table
      .foreign(["document_id", "sheet_index"])
      .references(["document_id", "sheet_index"])
      .inTable("onagre_document_sheet");
    table.primary(["document_id", "sheet_index", "row_number"]);
  });
}
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable("onagre_document_row");
  await knex.schema.dropTable("onagre_document_sheet");
  await knex.schema.dropTable("onagre_document");
}
