import type { Knex } from "knex";

/**
 * Add the "Cartographie du projet" geometries synced from Démarche Numérique.
 *
 * The "Cartographie du projet" is a CarteChamp: zones drawn by the usager on a map.
 * Démarche Numérique does not expose it as a downloadable image/PDF; instead its
 * GraphQL API exposes the raw geometry as GeoJSON. We store it as a GeoJSON
 * FeatureCollection, directly downloadable and directly loadable as a MapLibre source.
 */
export async function up(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.jsonb("cartographie_projet");
  });
}

export async function down(knex: Knex) {
  return knex.schema.alterTable("dossier", (table) => {
    table.dropColumn("cartographie_projet");
  });
}
