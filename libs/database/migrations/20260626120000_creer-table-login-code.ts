import type { Knex } from "knex";

// Short-lived email login codes, shared across the Pitchou apps. A code is sent by
// email and entered on the login page to prove the person controls the address;
// each app layers its own authorization on top. Only the sha256 of the code is
// stored, so a DB read-leak can't be replayed. One active code per email (the
// primary key), so requesting a new code overwrites the previous one.
export async function up(knex: Knex) {
  await knex.schema.createTable("login_code", function (table) {
    table.text("email").primary();
    table.text("code_hash").notNullable();
    table.integer("attempts").notNullable().defaultTo(0);
    table.timestamp("date_created", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("date_expired", { useTz: true }).notNullable();
    table.index("date_expired");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("login_code");
}
