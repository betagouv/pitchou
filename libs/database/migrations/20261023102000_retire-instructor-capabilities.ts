import type { Knex } from "knex";

export async function up(db: Knex) {
  await db.schema.dropTable("edge_personne__cap_annotation_write");
  await db.schema.dropTable("cap_annotation_write");
  await db.schema.dropTable("edge_cap_dossier__groupe_instructeurs");
  await db.schema.dropTable("cap_dossier");
  await db.schema.dropTable("cap_evenement_metrique");
}
export async function down() {
  throw new Error("Restore the pre-migration backup with the matching application version.");
}
