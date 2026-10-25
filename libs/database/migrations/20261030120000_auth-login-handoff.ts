import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("auth_login_handoff", (table) => {
    table.string("id", 43).primary();
    table.timestamp("expires_at", { useTz: true }).notNullable().index();
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("auth_login_handoff");
}
