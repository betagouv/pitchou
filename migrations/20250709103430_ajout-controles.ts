import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("contrôle", function (table) {
    table.uuid("id").primary().defaultTo(knex.fn.uuid());

    table.uuid("prescription").notNullable().index();
    table.foreign("prescription").references("id").inTable("prescription").onDelete("CASCADE");

    table.datetime("date_contrôle", { precision: 0 }); // précision à la seconde
    table
      .string("résultat")
      .comment(
        `Pour le moment, c'est une string. Et après un certain temps, on pourra refermer les valeurs à un ensemble fini`,
      );
    table.text("commentaire");
    table
      .string("type_action_suite_contrôle")
      .comment(
        `Pour le moment, c'est une string. Et après un certain temps, on pourra refermer les valeurs à un ensemble fini`,
      );
    table.date("date_action_suite_contrôle");
    table.date("date_prochaine_échéance");
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("contrôle");
}
