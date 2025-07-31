/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    await knex.schema.createTable('avis_expert', function (table) {
        table.uuid('id').primary().defaultTo(knex.fn.uuid());

        // Lien vers le dossier concerné. Un dossier peut faire l'objet de plusieurs avis d'experts.
        table.integer('dossier').notNullable().index();
        table.foreign('dossier')
            .references('id').inTable('dossier').onDelete('CASCADE');

        table.string('expert').comment("Instance consultée pour avis sur la dérogation (ex. : CSRPN, CNPN, autre autorité compétente).");

        table.date('date_saisine').comment("Date à laquelle l'expert a été officiellement saisi pour avis.");
        
        table.uuid('saisine_fichier').comment("Fichier transmis lors de la saisine de l'expert.");
        table.foreign('saisine_fichier')
            .references('id').inTable('fichier');

        table.string('avis').comment("Nature de l'avis émis par l'expert (ex. : Favorable, Favorable sous conditions, Défavorable, Non renseigné).");
        
        table.date('date_avis').comment("Date de formulation ou de réception de l'avis de l'expert.");
        
        table.uuid('avis_fichier').comment("Fichier contenant l'avis formel de l'expert.");
        table.foreign('avis_fichier')
            .references('id').inTable('fichier');
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('avis_expert');
};
