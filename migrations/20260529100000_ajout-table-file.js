/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.createTable("file", function (table) {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("nom").notNullable();
    table.string("media_type");
    table.bigInteger("taille").notNullable();
    table.string("DS_checksum").index();
    table.timestamp("DS_createdAt").index();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable("fichier", function (table) {
    table.uuid("file_id");
    table.foreign("file_id").references("id").inTable("file").onDelete("SET NULL");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.schema.alterTable("fichier", function (table) {
    table.dropForeign("file_id");
    table.dropColumn("file_id");
  });

  await knex.schema.dropTable("file");
}
