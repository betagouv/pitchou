import type { Knex } from "knex";

// DB-backed sessions shared across the Pitchou apps, independent of the identity
// provider. The table holds authentication (who the user is) only; each app applies
// its own authorization. `id` is the sha256 of the opaque cookie token, so a DB
// read-leak can't be replayed.
export async function up(knex: Knex) {
  await knex.schema.createTable("session", function (table) {
    table.text("id").primary();
    table.text("email").notNullable();
    table.text("name").notNullable().defaultTo("");
    // OIDC id_token, kept only for the logout id_token_hint.
    table.text("id_token");
    table.timestamp("date_created", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("date_expired", { useTz: true }).notNullable();
    table.index("date_expired");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("session");
}
