import type { Knex } from "knex";

export async function up(knex: Knex) {
  // Mettre à jour la colonne date_dépôt avec les valeurs de historique_réception_date_ddep
  // seulement si historique_date_réception_ddep n'est pas null
  await knex.raw(`
        UPDATE dossier 
        SET date_dépôt = historique_date_réception_ddep 
        WHERE historique_date_réception_ddep IS NOT NULL
    `);
}

// @ts-ignore migration historique : paramètre knex inutilisé
export async function down(knex: Knex) {
  // Cette migration ne peut pas être annulée de manière sûre
  // car nous ne savons pas quelles étaient les valeurs originales de date_dépôt
  console.log("Attention: Cette migration ne peut pas être annulée de manière sûre.");
}
