import type { Knex } from "knex";

/**
 * Lets a service share a dossier with another service in read-only mode.
 *
 * This is a table of its own rather than a column on
 * `edge_groupe_instructeurs__dossier`, because that edge is unique on `dossier`:
 * a dossier belongs to exactly one groupe, the one instructing it. Sharing is a
 * different relation — many groupes may read the same dossier — and keeping it
 * apart leaves the meaning of the ownership edge untouched.
 */
export async function up(knex: Knex) {
  await knex.schema.createTable("edge_groupe_instructeurs__dossier_lecture", (table) => {
    table
      .integer("dossier")
      .notNullable()
      .references("id")
      .inTable("dossier")
      .onDelete("CASCADE")
      .comment("The dossier shared in read-only mode.");
    table
      .uuid("groupe_instructeurs")
      .notNullable()
      .references("id")
      .inTable("groupe_instructeurs")
      .onDelete("CASCADE")
      .comment("The groupe the dossier is shared with. It never instructs it.");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.primary(["dossier", "groupe_instructeurs"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("edge_groupe_instructeurs__dossier_lecture");
}
