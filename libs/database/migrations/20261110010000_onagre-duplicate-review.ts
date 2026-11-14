import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_duplicate_project", (table) => {
    table.text("project_id").primary();
    table.text("review_hash").notNullable();
    table.jsonb("payload").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });
  await db.schema.createTable("onagre_duplicate_decision", (table) => {
    table.text("demande_key").primary();
    table
      .text("project_id")
      .notNullable()
      .references("project_id")
      .inTable("onagre_duplicate_project");
    table.text("review_hash").notNullable();
    table.text("outcome").notNullable();
    table.text("reason").notNullable();
    table.integer("version").notNullable();
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.check("outcome in ('pending', 'ignore', 'import_new')");
    table.check("version > 0");
    table.check("outcome = 'pending' or length(trim(reason)) > 0");
  });
  await db.schema.createTable("onagre_duplicate_revision", (table) => {
    table.increments("id").primary();
    table
      .text("demande_key")
      .notNullable()
      .references("demande_key")
      .inTable("onagre_duplicate_decision");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before");
    table.jsonb("after").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["demande_key", "id"]);
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_duplicate_revision");
  await db.schema.dropTable("onagre_duplicate_decision");
  await db.schema.dropTable("onagre_duplicate_project");
}
