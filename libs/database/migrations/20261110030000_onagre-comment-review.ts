import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_comment_group", (table) => {
    table.text("id").primary();
    table.text("review_hash").notNullable();
    table.text("category").notNullable();
    table.text("value").notNullable();
    table.integer("project_count").notNullable();
    table.integer("demande_count").notNullable();
    table.jsonb("payload").notNullable();
    table.jsonb("provenance").notNullable();
    table.index(["category", "demande_count"]);
  });
  await db.schema.createTable("onagre_comment_decision", (table) => {
    table.text("group_id").primary().references("id").inTable("onagre_comment_group");
    table.text("review_hash").notNullable();
    table.text("outcome").notNullable();
    table.text("target");
    table.text("classification");
    table.text("code");
    table.text("reason").notNullable();
    table.integer("version").notNullable();
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.check("outcome in ('pending','proposed','keep_comment','needs_reference')");
    table.check("version > 0");
    table.check(
      "outcome <> 'proposed' or (target is not null and classification is not null and code is not null)",
    );
  });
  await db.schema.createTable("onagre_comment_revision", (table) => {
    table.increments("id").primary();
    table.text("group_id").notNullable().references("group_id").inTable("onagre_comment_decision");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before");
    table.jsonb("after").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_comment_revision");
  await db.schema.dropTable("onagre_comment_decision");
  await db.schema.dropTable("onagre_comment_group");
}
