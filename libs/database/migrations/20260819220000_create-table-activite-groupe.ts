import type { Knex } from "knex";

/**
 * Activities are displayed in thematic groups (« Projets urbains », « Énergie », …), each with
 * its own pastel color used behind the activity icons. The groups are part of the referentiel:
 * administrators can move an activity from one group to another, and the groups drive the
 * layout of the admin referentiel page.
 */

type ActiviteGroupeRow = { code: string; label: string; color: string };

/** Groups and their color, following the product design. Groups are displayed alphabetically. */
export const ACTIVITE_GROUPES: ActiviteGroupeRow[] = [
  { code: "projets-urbains", label: "Projets urbains", color: "#fde9e7" },
  { code: "energie", label: "Énergie", color: "#fdedac" },
  { code: "transport-energie-eau", label: "Transport énergie - eau", color: "#feebd0" },
  { code: "activite-economique", label: "Activité économique", color: "#f7ebe5" },
  { code: "infrastructures", label: "Infrastructures", color: "#e5eeff" },
  { code: "science-education", label: "Science et éducation", color: "#c6f6fc" },
  { code: "ecologie", label: "Écologie", color: "#c9fdac" },
  { code: "faune", label: "Faune", color: "#f7ecdb" },
  { code: "autres-activites", label: "Autres activités", color: "#c3fad5" },
];

/** Group every activity in the migration `20260819130000` seed belongs to. */
export const GROUPE_BY_ACTIVITE_CODE: Record<string, string> = {
  "urbanisation-logement": "projets-urbains",
  "batiments-services-publics": "projets-urbains",
  "loisir-tourisme": "projets-urbains",
  "restauration-batiments": "projets-urbains",
  "energie-photovoltaique": "energie",
  "energie-nucleaire": "energie",
  "energie-eolien": "energie",
  "energie-eolien-suivi-mortalite": "energie",
  "energie-hydroelectricite": "energie",
  "energie-methaniseur-biomasse": "energie",
  "energie-autres": "energie",
  "transport-electricite": "transport-energie-eau",
  "transport-gaz": "transport-energie-eau",
  "transport-hydrocarbures": "transport-energie-eau",
  "transport-autres-canalisations": "transport-energie-eau",
  "transport-eau-aqueduc": "transport-energie-eau",
  "exploitation-forestiere": "activite-economique",
  "amenagements-fonciers": "activite-economique",
  "industries-production": "activite-economique",
  "plateformes-logistiques": "activite-economique",
  zac: "activite-economique",
  carrieres: "activite-economique",
  "gestion-dechets": "activite-economique",
  "unite-touristique-nouvelle": "activite-economique",
  "installations-agricoles": "activite-economique",
  "defense-contre-la-mer": "infrastructures",
  "infrastructures-aeroportuaires": "infrastructures",
  "transport-ferroviaire": "infrastructures",
  "transport-maritime-fluvial": "infrastructures",
  "transport-routier": "infrastructures",
  "infrastructures-autres": "infrastructures",
  "demande-scientifique": "science-education",
  "pedagogique-enseignement": "science-education",
  "restauration-ecologique": "ecologie",
  "conservation-especes": "ecologie",
  "gestion-eau": "ecologie",
  "peril-animalier": "faune",
  "dommages-biens-activites": "faune",
  desairage: "faune",
  "securite-sante-publique": "autres-activites",
  evenementiel: "autres-activites",
  autre: "autres-activites",
};

const FALLBACK_GROUPE_CODE = "autres-activites";

export async function up(knex: Knex) {
  await knex.schema.createTable("activite_groupe", function (table) {
    table.comment(
      "Thematic groups of the activity referentiel. Activities are displayed grouped by " +
        "activite_groupe, each group with its own color.",
    );

    table.text("code").primary().comment("Stable identifier, e.g. 'projets-urbains'.");
    table
      .text("label")
      .notNullable()
      .unique()
      .comment("Display name shown in Pitchou, renamable by administrators.");
    table
      .text("color")
      .notNullable()
      .comment("Pastel background color of the group, as a CSS hex value, e.g. '#fceeb5'.");
  });

  await knex("activite_groupe").insert(ACTIVITE_GROUPES);

  await knex.schema.alterTable("activite", function (table) {
    table
      .text("groupe_code")
      .references("code")
      .inTable("activite_groupe")
      .comment("Thematic group the activity is displayed under.");
  });

  for (const [code, groupe_code] of Object.entries(GROUPE_BY_ACTIVITE_CODE)) {
    await knex("activite").where({ code }).update({ groupe_code });
  }
  // Activities created by administrators before this migration ran have no known group.
  await knex("activite").whereNull("groupe_code").update({ groupe_code: FALLBACK_GROUPE_CODE });

  await knex.schema.alterTable("activite", function (table) {
    table.text("groupe_code").notNullable().alter();
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("activite", function (table) {
    table.dropColumn("groupe_code");
  });
  await knex.schema.dropTableIfExists("activite_groupe");
}
