import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  // A reference catalogue only: importing it grants no memberships or dossier access.
  await db.schema.createTable("onagre_group_catalog", (table) => {
    table.uuid("id").primary();
    table.text("name").notNullable();
    table.boolean("active").notNullable();
    table.boolean("coverage_needs_review").notNullable();
    table.jsonb("departments").notNullable();
    table.text("source").notNullable();
    table.timestamp("refreshed_at", { useTz: true }).notNullable();
  });
  await db.schema.createTable("onagre_service_mapping", (table) => {
    table.text("source_instance").notNullable().defaultTo("onagre-national");
    table.integer("service_id").notNullable();
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.jsonb("source").notNullable();
    table.text("source_hash").notNullable();
    table.jsonb("group_ids").notNullable();
    table.text("status").notNullable();
    table.text("notes").notNullable().defaultTo("");
    table.integer("version").notNullable();
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.primary(["source_instance", "service_id"]);
    table.check("source_instance = 'onagre-national' AND service_id > 0 AND version > 0");
    table.check("status IN ('todo','review','discuss','validated','excluded')");
  });
  await db.schema.createTable("onagre_service_mapping_revision", (table) => {
    table.increments("id");
    table.text("source_instance").notNullable();
    table.integer("service_id").notNullable();
    table
      .foreign(["source_instance", "service_id"])
      .references(["source_instance", "service_id"])
      .inTable("onagre_service_mapping");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before");
    table.jsonb("after").notNullable();
    table.jsonb("groups").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });
}
export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_service_mapping_revision");
  await db.schema.dropTable("onagre_service_mapping");
  await db.schema.dropTable("onagre_group_catalog");
}
