import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_import_run", (table) => {
    table.uuid("id").primary();
    table.uuid("preview_id").notNullable().unique();
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.text("source_instance").notNullable();
    table.text("profile_version").notNullable();
    table.string("mapping_hash", 64).notNullable();
    table.string("input_hash", 64).notNullable();
    table.string("target_hash", 64).notNullable();
    table.jsonb("frozen_input").notNullable();
    table.jsonb("report").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.check("source_instance = 'onagre-national'");
  });
  await db.schema.createTable("onagre_import_identity", (table) => {
    table.text("source_instance").notNullable();
    table.integer("source_id").notNullable();
    table.integer("dossier_id").notNullable().unique().references("id").inTable("dossier");
    table.uuid("run_id").notNullable().references("id").inTable("onagre_import_run");
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.text("profile_version").notNullable();
    table.string("source_hash", 64).notNullable();
    table.string("target_hash", 64).notNullable();
    table.jsonb("raw_source").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.primary(["source_instance", "source_id"]);
    table.check("source_instance = 'onagre-national' AND source_id > 0");
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_import_identity");
  await db.schema.dropTable("onagre_import_run");
}
