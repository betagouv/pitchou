import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_question", (table) => {
    table.uuid("id").primary();
    table.text("title").notNullable();
    for (const name of ["context", "examples", "options", "answer"])
      table.text(name).notNullable().defaultTo("");
    table.text("status").notNullable().defaultTo("open");
    table.integer("version").notNullable().defaultTo(1);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.check("status in ('open', 'answered', 'deferred')");
    table.check("version > 0");
    table.check("status <> 'answered' or length(trim(answer)) > 0");
  });
  await db.schema.createTable("onagre_question_revision", (table) => {
    table.increments("id").primary();
    table.uuid("question_id").notNullable().references("id").inTable("onagre_question");
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.jsonb("before");
    table.jsonb("after").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.index(["question_id", "id"]);
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_question_revision");
  await db.schema.dropTable("onagre_question");
}
