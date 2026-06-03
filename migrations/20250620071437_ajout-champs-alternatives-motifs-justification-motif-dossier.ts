import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .text("justification_absence_autre_solution_satisfaisante")
      .comment(`Article L411-2 I.4 du code de l'environnement`);
    table
      .string("motif_dérogation")
      .comment(`Article L411-2 I.4 a) b) c) d) e) du code de l'environnement`);
    table.text("justification_motif_dérogation");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumns(
      "justification_absence_autre_solution_satisfaisante",
      "motif_dérogation",
      "justification_motif_dérogation",
    );
  });
}
