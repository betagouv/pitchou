import type { Knex } from "knex";

/**
 * Gives the espèces impactées file of a dossier its own table, so what is read from the file (its
 * anomalies) is stored with the file: replacing or deleting the file replaces or deletes them too.
 */

export async function up(knex: Knex) {
  await knex.schema.createTable("file_especes_impactees", (table) => {
    table.comment("An Espèces Impactées file provided by the Porteur de projet.");

    table.uuid("id").primary().defaultTo(knex.fn.uuid());
    table.uuid("file").notNullable().unique();
    table.foreign("file").references("id").inTable("file").onDelete("CASCADE");

    table
      .jsonb("anomalies")
      .nullable()
      .comment(
        "The anomalies contained in Espèces Impactées file provided by the Porteur de projet. " +
          "Null until the file has been read.",
      );
  });
  await knex.raw(`
    INSERT INTO file_especes_impactees (file)
    SELECT DISTINCT especes_impactees FROM dossier WHERE especes_impactees IS NOT NULL
  `);

  await knex.schema.alterTable("dossier", (table) => {
    table
      .uuid("file_especes_impactees")
      .nullable()
      .comment("Reference to the Espèces Impactées file provided by the Porteur de projet.");
    table
      .foreign("file_especes_impactees")
      .references("id")
      .inTable("file_especes_impactees")
      .onDelete("SET NULL");
  });
  await knex.raw(`
    UPDATE dossier d SET file_especes_impactees = f.id
    FROM file_especes_impactees f
    WHERE f.file = d.especes_impactees
  `);
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("file_especes_impactees");
  });
  await knex.schema.dropTable("file_especes_impactees");
}
