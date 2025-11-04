/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.boolean('etat_des_lieux_ecologique_complet_realise')
            .comment(`Réponse à la question : "Avez-vous réalisé un état des lieux écologique complet ?"`)
        table.boolean('presence_especes_dans_aire_influence')
            .comment(`Réponse à la question : "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?"`)
        table.boolean('risque_malgre_mesures_erc')
            .comment(`Réponse à la question : "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?"`)
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable('dossier', (table) => {
        table.dropColumn('etat_des_lieux_ecologique_complet_realise')
        table.dropColumn('presence_especes_dans_aire_influence')
        table.dropColumn('risque_malgre_mesures_erc')
    });
};
