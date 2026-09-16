import type { Knex } from "knex";

// The BDC-Statuts import kept the statut type (PN, LRN…) but not its code (VU, EN, CR…),
// so the national red-list category of a species could not be read. `code_statut` now
// carries it, and the reference keeps the most threatened national red-list category
// (CR > EN > VU, null otherwise) so the interface can flag threatened species.

const VIEW_WITH_LISTE_ROUGE = `
  CREATE OR REPLACE VIEW espece_protegee AS
  SELECT
    COALESCE(m.cd_ref,             r.cd_ref)             AS cd_ref,
    COALESCE(m.classification,     r.classification)     AS classification,
    COALESCE(m.noms_scientifiques, r.noms_scientifiques) AS noms_scientifiques,
    COALESCE(m.noms_vernaculaires, r.noms_vernaculaires) AS noms_vernaculaires,
    COALESCE(m.cd_type_statuts,    r.cd_type_statuts)    AS cd_type_statuts,
    COALESCE(m.espece_ministerielle, false)              AS espece_ministerielle,
    COALESCE(m.espece_cnpn,          false)              AS espece_cnpn,
    r.statut_liste_rouge                                 AS statut_liste_rouge
  FROM espece_protegee_reference r
  FULL OUTER JOIN espece_protegee_modification m ON m.cd_ref = r.cd_ref
  WHERE m.excluded IS NOT TRUE;
`;

const VIEW_WITHOUT_LISTE_ROUGE = `
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
  WHERE m.excluded IS NOT TRUE;
`;

export async function up(knex: Knex) {
  await knex.schema.alterTable("espece_bdc_statut", function (table) {
    table.text("code_statut").notNullable().defaultTo("");
  });
  await knex.schema.alterTable("espece_protegee_reference", function (table) {
    table.text("statut_liste_rouge");
  });
  // Appending a column keeps CREATE OR REPLACE valid; the dependent objects survive.
  await knex.raw(VIEW_WITH_LISTE_ROUGE);
}

export async function down(knex: Knex) {
  await knex.raw("DROP VIEW IF EXISTS espece_protegee");
  await knex.raw(VIEW_WITHOUT_LISTE_ROUGE);
  await knex.schema.alterTable("espece_protegee_reference", function (table) {
    table.dropColumn("statut_liste_rouge");
  });
  await knex.schema.alterTable("espece_bdc_statut", function (table) {
    table.dropColumn("code_statut");
  });
}
