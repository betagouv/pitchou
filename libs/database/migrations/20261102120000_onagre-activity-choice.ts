import type { Knex } from "knex";
export async function up(db: Knex): Promise<void> {
  // Keep the activity choice on the shared decision, so every view edits the same revision.
  // No FK: preparation can retain a decision after its reference activity is removed.
  await db.schema.alterTable("onagre_mapping", (table) => table.text("activity_code").nullable());
}
export async function down(db: Knex): Promise<void> {
  await db.schema.alterTable("onagre_mapping", (table) => table.dropColumn("activity_code"));
}
