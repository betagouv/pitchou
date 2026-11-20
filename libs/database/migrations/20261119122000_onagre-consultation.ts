import type { Knex } from "knex";

export async function up(db: Knex): Promise<void> {
  await db.schema.createTable("onagre_consultation", (table) => {
    table.text("source_key").primary();
    table
      .integer("dossier")
      .notNullable()
      .references("id")
      .inTable("dossier")
      .onDelete("CASCADE")
      .index();
    table.uuid("avis_expert_id").references("id").inTable("avis_expert").onDelete("CASCADE");
    table.jsonb("payload").notNullable();
  });
}

export async function down(db: Knex): Promise<void> {
  await db.schema.dropTable("onagre_consultation");
}
