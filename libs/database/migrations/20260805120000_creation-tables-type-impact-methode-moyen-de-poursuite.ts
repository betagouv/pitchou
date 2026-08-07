import type { Knex } from "knex";

import { METHODES, MOYENS_DE_POURSUITE, TYPES_IMPACT } from "./data/20260805120000-referentiel.ts";

export { METHODES, MOYENS_DE_POURSUITE, TYPES_IMPACT };

export async function up(knex: Knex) {
  await knex.schema.createTable("type_impact", function (table) {
    table.comment(
      "Types of impact a projet can have on a protected species, and the criteres that can " +
        "qualify each of them. Type of impact is called Activité by the European Commission.",
    );

    table
      .text("identifiant_pitchou")
      .primary()
      .comment("Pitchou identifier, e.g. 'P-2-1' for 'Type d'impact'.");
    table
      .text("code_europeen")
      .notNullable()
      .comment(
        "Code used when reporting to the European Commission (HaBiDeS+). Not unique: P-70-1, " +
          "P-70-2 and P-70-3 are three Pitchou types reported under the single code 70.",
      );
    table
      .text("classification")
      .notNullable()
      .comment(
        "Living-being classification this type impact applies to: 'oiseau', 'faune non-oiseau' " +
          "or 'flore'. Also decides which methode and moyen_de_poursuite rows can qualify it.",
      );
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou.");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the activity in the European directive.");
    table
      .specificType("activites_onagre", "text[]")
      .notNullable()
      .defaultTo("{}")
      .comment(
        "Labels of the Onagre reference activities that correspond to this type impact. " +
          "Informative: it records how the Onagre vocabulary maps onto the Pitchou one.",
      );

    table
      .boolean("critere_methode")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a methode can qualify this type impact.");
    table
      .boolean("critere_moyen_de_poursuite")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a moyen de poursuite can qualify this type impact.");
    table
      .boolean("critere_nombre_individus")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of impacted individuals can be given.");
    table
      .boolean("critere_nids")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of nids can be given.");
    table
      .boolean("critere_oeufs")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a number of oeufs can be given.");
    table
      .boolean("critere_surface_habitat_detruit")
      .notNullable()
      .defaultTo(false)
      .comment("Whether a destroyed habitat area, in m², can be given.");

    // The form always reads the types d'impact of a single classification at a time.
    table.index("classification");
  });

  await knex.schema.createTable("methode", function (table) {
    table.comment(
      "Methods used to reach the impacted species, offered when the type impact has " +
        "critere_methode.",
    );

    table.text("code").primary().comment("Method code from the European directive.");
    table
      .text("classification")
      .notNullable()
      .comment("Living-being classification this methode can qualify.");
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the method in the European directive");
  });

  await knex.schema.createTable("moyen_de_poursuite", function (table) {
    table.comment(
      "Means of pursuit used to reach the impacted species, offered when the type impact has " +
        "critere_moyen_de_poursuite. Holds no flore row: the directive defines none. Also called Transport.",
    );

    table
      .text("code")
      .notNullable()
      .comment(
        "Means-of-pursuit code from the European directive. Not unique on its own: 0, 1 and 2 " +
          "each mean one thing in the Oiseaux directive and another in the Habitats directive.",
      );
    table
      .text("classification")
      .notNullable()
      .comment(
        "Living-being classification this moyen de poursuite can qualify: 'oiseau' or " +
          "'faune non-oiseau'. Part of the key, since it is what tells two identical codes apart.",
      );
    table.text("libelle_pitchou").notNullable().comment("Label shown to users in Pitchou");
    table
      .text("libelle_europeen")
      .notNullable()
      .defaultTo("")
      .comment("Wording of the means of pursuit in the European directive.");

    table.primary(["code", "classification"]);
  });

  await knex("type_impact").insert(TYPES_IMPACT);
  await knex("methode").insert(METHODES);
  await knex("moyen_de_poursuite").insert(MOYENS_DE_POURSUITE);
}

export async function down(knex: Knex) {
  await knex.schema.dropTableIfExists("moyen_de_poursuite");
  await knex.schema.dropTableIfExists("methode");
  await knex.schema.dropTableIfExists("type_impact");
}
