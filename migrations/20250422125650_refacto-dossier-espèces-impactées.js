import knexModule from 'knex'

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {

    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });

    const fichiers = await databaseConnection('fichier')
        .select(['id', 'dossier'])
        .whereNotNull('dossier')

    const updatesDone = Promise.all(fichiers.map(f => {
        const {id: fichierId, dossier: dossierId} = f

        return databaseConnection('dossier')
            .update({espèces_impactées: fichierId})
            .where({id: dossierId})
    }))

    return updatesDone
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    
    const databaseConnection = knexModule({
        client: 'pg',
        connection: process.env.DATABASE_URL,
    });

    return databaseConnection('dossier')
        .update({espèces_impactées: null})
};

