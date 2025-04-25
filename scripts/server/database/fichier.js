import {directDatabaseConnection} from '../database.js'

/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {Knex} from 'knex' */



/**
 * Fonction qui créé une clef unique pour la valeur de son argument
 * 
 * @param {Partial<Fichier>} espèceImpactée 
 * @returns {string}
 */
export function makeFichierHash(espèceImpactée){
    return [
        espèceImpactée.DS_checksum,
        espèceImpactée.DS_createdAt?.toISOString(),
        espèceImpactée.nom,
        espèceImpactée.media_type
    ].join('-')
}

/**
 * 
 * @param {Partial<Fichier>[]} descriptionsFichier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export function trouverFichiersExistants(descriptionsFichier, databaseConnection = directDatabaseConnection){

    return databaseConnection('fichier')
        .select(['DS_checksum', 'DS_createdAt', 'nom', 'media_type'])
        .whereIn(
            ['DS_checksum', 'DS_createdAt', 'nom', 'media_type'],
            // @ts-ignore
            descriptionsFichier
                .map(({DS_checksum, DS_createdAt, nom, media_type}) => 
                    [DS_checksum, DS_createdAt, nom, media_type]
                )
        )

}

/**
 * 
 * @param {Partial<Fichier>} f 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>>}
 */
export function ajouterFichier(f, databaseConnection = directDatabaseConnection){
    return databaseConnection('fichier')
        .insert(f)
        .returning(['id', 'DS_checksum', 'DS_createdAt', 'nom', 'media_type'])
        .then(files => files[0])
}


