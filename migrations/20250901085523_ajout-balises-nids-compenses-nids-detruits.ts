import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table
      .integer("nombre_nids_détruits_dossier_oiseau_simple")
      .comment(`Réponse à la question "Nombre de nids d'Hirondelles détruits"`);
    table
      .integer("nombre_nids_compensés_dossier_oiseau_simple")
      .comment(
        `Réponse à la question "Indiquer le nombre de nids artificiels posés en compensation". Concerne les dossiers spécifiques à des oiseaux, comme les hirondelles ou les cigognes.`,
      );
    table
      .enu("type", ["Hirondelle", "Cigogne"], {
        useNative: true,
        enumName: "TypeDossier",
      })
      .comment(
        "Type du dossier. Les instructeurices ont des typologies de dossiers qui reviennent souvent, comme les dossiers Hirondelles, les dossiers Cigognes...",
      );
  });
}

export async function down(knex: Knex) {
  await knex.schema.alterTable("dossier", function (table) {
    table.dropColumns(
      "nombre_nids_détruits_dossier_oiseau_simple",
      "nombre_nids_compensés_dossier_oiseau_simple",
      "type",
    );
  });

  await knex.schema.raw('DROP TYPE IF EXISTS "type_dossier_enum";');
}
