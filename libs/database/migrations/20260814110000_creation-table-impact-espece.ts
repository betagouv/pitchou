import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.createTable("impact_espece", function (table) {
    table.comment("One row per protected espece impacted by a dossier, and how it is impacted.");

    table.bigIncrements("id").primary();

    table.integer("dossier").notNullable().index();
    table.foreign("dossier").references("id").inTable("dossier").onDelete("CASCADE");

    table.uuid("source_file").notNullable().index().comment("The file this row was parsed from.");
    table.foreign("source_file").references("id").inTable("file").onDelete("CASCADE");

    table
      .text("cd_ref")
      .notNullable()
      .comment(
        "TAXREF identifier of the impacted espece. No foreign key: 'espece_protegee' is a view, " +
          "so Postgres cannot enforce one. A CD_REF missing from the referential is reported to " +
          "the instructrice rather than imported.",
      );

    table
      .text("classification")
      .notNullable()
      .comment(
        "Living-being classification of the espece: 'oiseau', 'faune non-oiseau' or 'flore'. " +
          "Redundant with the espece, but it is half the key of impact_moyen_de_poursuite, so it " +
          "has to be on the row for that foreign key to exist.",
      );

    table
      .text("impact_type")
      .index()
      .comment(
        "Type of impact, e.g. 'P-2-1'. Nullable: a file may leave it empty, and those rows are " +
          "already displayed apart, under 'Type d'impact non renseigné'.",
      );
    table.foreign("impact_type").references("identifiant_pitchou").inTable("impact_type");

    table.text("impact_methode");
    table.foreign("impact_methode").references("code").inTable("impact_methode");

    table
      .text("impact_moyen_de_poursuite")
      .comment("Means of pursuit used to reach the espece. Only when the type d'impact allows it.");

    // Composite: the same code means one thing under the Oiseaux directive and another under the
    // Habitats one, so the classification is what tells them apart.
    table
      .foreign(["impact_moyen_de_poursuite", "classification"])
      .references(["code", "classification"])
      .inTable("impact_moyen_de_poursuite");

    table
      .text("nombre_individus")
      .comment("Number of impacted individuals, as a range such as '11-100'. Not a number.");
    table.integer("nids").comment("Number of impacted nids. Only ever filled for an oiseau.");
    table.integer("oeufs").comment("Number of impacted eggs. Only ever filled for an oiseau.");
    table.integer("surface_habitat_detruit").comment("Destroyed habitat area, in square meters.");

    table.timestamps(true, true);
  });
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("impact_espece");
}
