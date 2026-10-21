import type { Knex } from "knex";

/** The déposant is now a dossier_acteur. The down migration recreates the column empty. */
export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("deposant");
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", (table) => {
    table
      .integer("deposant")
      .index("dossier_déposant_index")
      .comment(
        'The deposant is the personne who submits the dossier on DS. In some situations, this personne differs from the demandeur (the personne morale or personne physique requesting the derogation), for example when a consulting firm authorized by a personne morale submits the dossier. The deposant is not necessarily the demandeur\'s internal representative (main point of contact). In DS terminology, what we call "déposant" is stored in the "demandeur" property (which differs from our "demandeur")',
      );
    table.foreign("deposant", "dossier_déposant_foreign").references("id").inTable("personne");
  });
}
