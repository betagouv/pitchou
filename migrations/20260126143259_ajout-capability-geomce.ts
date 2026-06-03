import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("capability-geomce", function (table) {
    table
      .uuid("secret")
      .defaultTo(knex.fn.uuid())
      .notNullable()
      .primary()
      .comment(`Cette table n'a qu'une seule ligne, une seule valeur`);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("capability-geomce");
}
