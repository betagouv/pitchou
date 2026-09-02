import type { Knex } from "knex";

// Changelog entries shown to users on the public « Nouveautés » page and managed
// from the Admin app. Entries carry a surrogate id (stable admin URLs) plus an
// editor-chosen version split into three segments, so a half-typed version
// still saves; the joined « X.Y.Z » is the public URL segment. The unique index
// only bites on complete triples (NULLs are distinct in Postgres), letting any
// number of drafts stay unnumbered. Publishing requires a titre and a complete
// version — enforced in the API. `contenu` holds HTML sanitized server-side at
// write time.
export async function up(knex: Knex) {
  await knex.schema.createTable("changelog", function (table) {
    table.increments("id").primary();
    table.integer("version_major");
    table.integer("version_minor");
    table.integer("version_patch");
    table.date("date").notNullable().defaultTo(knex.fn.now());
    table.text("titre").notNullable();
    table.text("contenu").notNullable().defaultTo("");
    table.boolean("published").notNullable().defaultTo(false);
    table.text("updated_by").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(["version_major", "version_minor", "version_patch"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("changelog");
}
