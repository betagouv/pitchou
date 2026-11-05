import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`alter table onagre_mapping
    drop constraint onagre_mapping_status_check,
    add constraint onagre_mapping_status_check
    check (status in ('todo', 'review', 'discuss', 'validated', 'excluded'))`);
}

export async function down(knex: Knex): Promise<void> {
  // Keep decisions and their revisions intact instead of silently reclassifying them.
  if (await knex("onagre_mapping").where({ status: "review" }).first("key"))
    throw new Error("Reclassify mappings awaiting validation before reverting this migration.");
  await knex.raw(`alter table onagre_mapping
    drop constraint onagre_mapping_status_check,
    add constraint onagre_mapping_status_check
    check (status in ('todo', 'discuss', 'validated', 'excluded'))`);
}
