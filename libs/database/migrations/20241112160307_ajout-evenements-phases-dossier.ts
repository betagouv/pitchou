import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("évènement_phase_dossier", function (table) {
    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table.string("phase").notNullable();
    table.datetime("horodatage", { precision: 0 }).notNullable(); // précision à la seconde

    table.unique(["dossier", "phase", "horodatage"]);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTable("évènement_phase_dossier");
}
