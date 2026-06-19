import type { Knex } from "knex";

// `espece_protegee` is exposed as a view over two layers:
//
//  - `espece_protegee_reference`: a table derived from the source tables
//    `espece_taxref` + `espece_bdc_statut` (names aggregated per CD_REF, accepted
//    name first). Rebuilt by `rebuildEspeceProtegeeReference` (recipe
//    `generate-especes-protegees`) after importing the sources.
//  - `espece_protegee_modification`: the manual layer, never derived. Sparse patch
//    (NULL = inherit from the reference), ministérielle/CNPN flags, `exclu`, audit.
//
// The source tables `espece_taxref` / `espece_bdc_statut` both feed the reference.

export async function up(knex: Knex) {
  // --- Raw sources (imported from the INPN files) ---
  await knex.schema.createTable("espece_taxref", function (table) {
    // `id` = import order, used to make the synonym ordering deterministic.
    table.bigIncrements("id").primary();
    table.text("cd_nom").notNullable();
    table.text("cd_ref").notNullable();
    table.text("lb_nom").notNullable().defaultTo("");
    table.text("nom_vern").notNullable().defaultTo("");
    table.text("regne").notNullable().defaultTo("");
    table.text("classe").notNullable().defaultTo("");
    table.index("cd_ref");
    table.index("cd_nom");
  });

  await knex.schema.createTable("espece_bdc_statut", function (table) {
    table.bigIncrements("id").primary();
    table.text("cd_nom").notNullable();
    table.text("cd_ref").notNullable();
    table.text("cd_type_statut").notNullable();
    table.text("label_statut").notNullable().defaultTo("");
    table.index("cd_ref");
    table.index("cd_type_statut");
  });

  await knex.schema.createTable("espece_protegee_modification", function (table) {
    table.text("cd_ref").primary();
    // Columns shared with the reference: NULL ⇒ inherit from the reference.
    table.text("classification");
    table.specificType("noms_scientifiques", "text[]");
    table.specificType("noms_vernaculaires", "text[]");
    table.specificType("cd_type_statuts", "text[]");
    // Flags specific to the manual layer.
    table.boolean("espece_ministerielle");
    table.boolean("espece_cnpn");
    // Tombstone: hides the species in the view (exclusion).
    table.boolean("exclu").notNullable().defaultTo(false);
    // Audit
    table.text("modifie_par");
    table.timestamps(true, true);
  });

  // --- Reference: rebuilt from espece_taxref + espece_bdc_statut by
  //     rebuildEspeceProtegeeReference() — one row per protected CD_REF. ---
  await knex.schema.createTable("espece_protegee_reference", function (table) {
    table.text("cd_ref").primary();
    table.text("classification").notNullable();
    table.specificType("noms_scientifiques", "text[]").notNullable().defaultTo("{}");
    table.specificType("noms_vernaculaires", "text[]").notNullable().defaultTo("{}");
    table.specificType("cd_type_statuts", "text[]").notNullable().defaultTo("{}");
  });

  // --- Public view: merge of reference + manual layer ---
  await knex.raw(`
    CREATE VIEW espece_protegee AS
    SELECT
      COALESCE(m.cd_ref,             r.cd_ref)             AS cd_ref,
      COALESCE(m.classification,     r.classification)     AS classification,
      COALESCE(m.noms_scientifiques, r.noms_scientifiques) AS noms_scientifiques,
      COALESCE(m.noms_vernaculaires, r.noms_vernaculaires) AS noms_vernaculaires,
      COALESCE(m.cd_type_statuts,    r.cd_type_statuts)    AS cd_type_statuts,
      COALESCE(m.espece_ministerielle, false)              AS espece_ministerielle,
      COALESCE(m.espece_cnpn,          false)              AS espece_cnpn
    FROM espece_protegee_reference r
    FULL OUTER JOIN espece_protegee_modification m ON m.cd_ref = r.cd_ref
    WHERE m.exclu IS NOT TRUE;
  `);
}

export async function down(knex: Knex) {
  await knex.raw("DROP VIEW IF EXISTS espece_protegee");
  await knex.schema.dropTableIfExists("espece_protegee_reference");
  await knex.schema.dropTableIfExists("espece_protegee_modification");
  await knex.schema.dropTableIfExists("espece_bdc_statut");
  await knex.schema.dropTableIfExists("espece_taxref");
}
