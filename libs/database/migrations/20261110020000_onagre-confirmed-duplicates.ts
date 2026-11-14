import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_confirmed_duplicate", (table) => {
    table.text("demande_key").primary();
    table.text("evidence_hash").notNullable();
    table.jsonb("payload").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_confirmed_duplicate");
}
