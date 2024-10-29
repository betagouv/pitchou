/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    /**
     * Pour représenter le lien entre instructeur et groupe_instructeurs, on supprime cette arête
     * et on la remplace par un lien 
     * personne => (1) cap_dossier => (n) groupe_instucteurs (=> (m) dossiers)
     * 
     */
    await knex.schema.dropTable('arête_groupe_instructeurs__personne');

    await knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.unique('nom')
    });

    await knex.schema.createTable('cap_dossier', function (table) {
        table.uuid('cap').primary().defaultTo(knex.fn.uuid())

        table.string('personne_cap').notNullable().unique()
        table.foreign('personne_cap')
            .references('code_accès').inTable('personne')
            .onDelete('CASCADE').onUpdate('CASCADE')
    });

    await knex.schema.createTable('arête_cap_dossier__groupe_instructeurs', function (table) {
        table.uuid('cap_dossier').notNullable().index()
        table.foreign('cap_dossier')
            .references('cap').inTable('cap_dossier')
            .onDelete('CASCADE').onUpdate('CASCADE')
        
        table.uuid('groupe_instructeurs').notNullable()
        table.foreign('groupe_instructeurs')
            .references('id').inTable('groupe_instructeurs')
            .onDelete('CASCADE')
    });

    /**
     * Chaque dossier n'appartient qu'à un seul groupe d'instructeur
     * et donc, un autre choix de conception aurait été de mettre une propriété 'groupe_instructeurs'
     * directement sur le dossier
     * 
     * Cette table sert à garder les sujets (dossiers, groupe_instructeurs) dans des tables séparées
     * Il n'est pas complètement clair si c'est une idée horrible ou inimportante ou très bonne, 
     * le temps nous le dira
     */
    await knex.schema.createTable('arête_groupe_instructeurs__dossier', function (table) {
        table.integer('dossier').notNullable().unique()
        table.foreign('dossier')
            .references('id').inTable('dossier')
            .onDelete('CASCADE')
        
        table.uuid('groupe_instructeurs').notNullable()
        table.foreign('groupe_instructeurs')
            .references('id').inTable('groupe_instructeurs')
            .onDelete('CASCADE')
    });

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.schema.dropTable('arête_groupe_instructeurs__dossier');
    await knex.schema.dropTable('arête_cap_dossier__groupe_instructeurs');
    await knex.schema.dropTable('cap_dossier');

    await knex.schema.alterTable('groupe_instructeurs', (table) => {
        table.dropUnique(['nom'])
    });

    await knex.schema.createTable('arête_groupe_instructeurs__personne', function (table) {
        table.uuid('groupe_instructeurs').notNullable().index()
        table.foreign('groupe_instructeurs')
            .references('id').inTable('groupe_instructeurs')
            .onDelete('CASCADE')

        table.integer('personne').notNullable().index()
        table.foreign('personne')
            .references('id').inTable('personne')
            .onDelete('CASCADE')
    });
};
