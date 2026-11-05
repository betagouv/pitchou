import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("onagre_snapshot", (table) => {
    table.increments("id");
    table.string("fingerprint", 64).notNullable().unique();
    table.text("filename").notNullable();
    table.string("workbook_fingerprint", 64).notNullable();
    table.jsonb("tables").notNullable();
    table.jsonb("workbook_mappings").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.createTable("onagre_mapping", (table) => {
    table.text("key").primary();
    table.text("section").notNullable();
    table.text("label").notNullable();
    table.text("context").notNullable();
    table.text("proposal").notNullable();
    table.text("confidence").notNullable();
    table.text("notes").notNullable().defaultTo("");
    table.text("target").notNullable().defaultTo("");
    table.text("rule").notNullable().defaultTo("");
    table.text("status").notNullable().defaultTo("todo");
    table.integer("version").notNullable().defaultTo(1);
    table.timestamp("updated_at", { useTz: true });
    table.check("status in ('todo', 'discuss', 'validated', 'excluded')");
  });
  await knex.schema.createTable("onagre_mapping_revision", (table) => {
    table.increments("id");
    table.text("mapping_key").notNullable().references("key").inTable("onagre_mapping");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before").notNullable();
    table.jsonb("after").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.schema.createTable("onagre_source_demande", (table) => {
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.integer("source_id").notNullable();
    table.integer("projet_id").notNullable();
    table.text("code").notNullable();
    table.text("name").notNullable();
    table.string("fingerprint", 64).notNullable();
    table.jsonb("demande").notNullable();
    table.jsonb("projet").notNullable();
    table.primary(["snapshot_id", "source_id"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  for (const table of [
    "onagre_source_demande",
    "onagre_mapping_revision",
    "onagre_mapping",
    "onagre_snapshot",
  ])
    await knex.schema.dropTable(table);
}
