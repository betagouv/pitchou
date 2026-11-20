import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.alterTable("impact_espece", (table) => table.text("onagre_activity"));
}

export async function down(db: Knex): Promise<void> {
  await db.schema.alterTable("impact_espece", (table) => table.dropColumn("onagre_activity"));
}
