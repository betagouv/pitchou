import type { Knex } from "knex";

export async function up(knex: Knex) {
  // arête_dossier__fichier_pièces_jointes_pétitionnaire
  // Drop unique + FK, migrate data (FichierId -> FileId), re-add pointing to file

  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    (table) => {
      table.dropUnique(["dossier", "fichier"], "arête_dossier_pj_pétitionnaire_unique");
      table.dropForeign("fichier");
    },
  );

  await knex.raw(`
    UPDATE "arête_dossier__fichier_pièces_jointes_pétitionnaire" AS pj
    SET "fichier" = f.file_id
    FROM fichier f
    WHERE f.id = pj.fichier
  `);

  await knex.schema.alterTable(
    "arête_dossier__fichier_pièces_jointes_pétitionnaire",
    (table) => {
      table.foreign("fichier").references("id").inTable("file").onDelete("CASCADE");
      table.unique(["dossier", "fichier"], { indexName: "arête_dossier_pj_pétitionnaire_unique" });
    },
  );

  // dossier.espèces_impactées

  await knex.schema.alterTable("dossier", (table) => {
    table.dropForeign("espèces_impactées");
  });

  await knex.raw(`
    UPDATE dossier d
    SET "espèces_impactées" = f.file_id
    FROM fichier f
    WHERE f.id = d."espèces_impactées"
      AND d."espèces_impactées" IS NOT NULL
  `);

  await knex.schema.alterTable("dossier", (table) => {
    table.foreign("espèces_impactées").references("id").inTable("file").onDelete("SET NULL");
  });

  // décision_administrative.fichier

  await knex.schema.alterTable("décision_administrative", (table) => {
    table.dropForeign("fichier");
  });

  await knex.raw(`
    UPDATE "décision_administrative" da
    SET "fichier" = f.file_id
    FROM fichier f
    WHERE f.id = da."fichier"
      AND da."fichier" IS NOT NULL
  `);

  await knex.schema.alterTable("décision_administrative", (table) => {
    table.foreign("fichier").references("id").inTable("file");
  });

  // avis_expert.saisine_fichier and avis_expert.avis_fichier

  await knex.schema.alterTable("avis_expert", (table) => {
    table.dropForeign("saisine_fichier");
    table.dropForeign("avis_fichier");
  });

  await knex.raw(`
    UPDATE avis_expert ae
    SET "saisine_fichier" = f.file_id
    FROM fichier f
    WHERE f.id = ae."saisine_fichier"
      AND ae."saisine_fichier" IS NOT NULL
  `);

  await knex.raw(`
    UPDATE avis_expert ae
    SET "avis_fichier" = f.file_id
    FROM fichier f
    WHERE f.id = ae."avis_fichier"
      AND ae."avis_fichier" IS NOT NULL
  `);

  await knex.schema.alterTable("avis_expert", (table) => {
    table.foreign("saisine_fichier").references("id").inTable("file");
    table.foreign("avis_fichier").references("id").inTable("file");
  });

  // Drop fichier table — all FKs pointing to it are now gone

  await knex.schema.dropTable("fichier");
}

export async function down(_knex: Knex) {
  throw new Error(
    "Irreversible migration — cannot recreate fichier table data.",
  );
}
