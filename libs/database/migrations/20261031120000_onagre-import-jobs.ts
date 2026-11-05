import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_import_job", (table) => {
    table.uuid("id").primary();
    table.integer("actor_id").notNullable().references("id").inTable("auth_user");
    table.integer("apply_actor_id").references("id").inTable("auth_user");
    table.integer("snapshot_id").notNullable().references("id").inTable("onagre_snapshot");
    table.text("status").notNullable();
    table.integer("total").notNullable();
    table.integer("analyzed").notNullable().defaultTo(0);
    table.integer("processed").notNullable().defaultTo(0);
    table.jsonb("counts").notNullable();
    table.jsonb("context").notNullable();
    table.text("context_hash").notNullable();
    table.text("error");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(db.fn.now());
    table.check(
      "status IN ('analyzing', 'review', 'importing', 'completed', 'failed', 'cancelled')",
    );
  });
  await db.raw(`CREATE UNIQUE INDEX onagre_import_job_active ON onagre_import_job ((true))
    WHERE status IN ('analyzing', 'review', 'importing')`);
  await db.schema.createTable("onagre_import_batch", (table) => {
    table.uuid("job_id").notNullable().references("id").inTable("onagre_import_job");
    table.integer("position").notNullable();
    table.jsonb("record_ids").notNullable();
    table.jsonb("preview");
    table.jsonb("frozen_input");
    table.uuid("run_id").references("id").inTable("onagre_import_run");
    table.primary(["job_id", "position"]);
  });
  await db.schema.alterTable("onagre_import_run", (table) => {
    table.uuid("job_id").references("id").inTable("onagre_import_job");
    table.index("job_id");
  });
}
export async function down(db: Knex): Promise<void> {
  await db.schema.alterTable("onagre_import_run", (table) => table.dropColumn("job_id"));
  await db.schema.dropTable("onagre_import_batch");
  await db.schema.dropTable("onagre_import_job");
}
