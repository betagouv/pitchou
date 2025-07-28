/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    // Mettre à jour la colonne date_dépôt avec les valeurs de historique_réception_date_ddep
    // seulement si historique_date_réception_ddep n'est pas null
    await knex.raw(`
        UPDATE dossier 
        SET date_dépôt = historique_date_réception_ddep 
        WHERE historique_date_réception_ddep IS NOT NULL
    `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    // Cette migration ne peut pas être annulée de manière sûre
    // car nous ne savons pas quelles étaient les valeurs originales de date_dépôt
    console.log('Attention: Cette migration ne peut pas être annulée de manière sûre.');
} 