
/** @import {default as Fichier} from '../../types/database/public/Fichier.ts' */
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {DossierDS88444} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {Knex} from 'knex' */

import {directDatabaseConnection} from '../database.js'


/**
 * Fonction qui créé une clef unique pour la valeur de son argument
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée 
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier
 * 
 * @param {Partial<Fichier>} fichier 
 * @returns {string}
 */
export function makeFichierHash(fichier){
    return [
        fichier.nom,
        fichier.media_type,
        fichier.DS_checksum
    ].join('-')
}

/**
 * Cette fonction n'utilise pas le fichier.created_at, car cette valeur est modifiée 
 * de manière non-souhaitée par DN
 * Spécifiquement, quand on a un champ PièceJointe avec plusieurs fichiers, si un fichier est rajouté,
 * les created_at de tous les fichiers sont modifiés à la date de l'ajout du dernier fichier 
 * 
 * @param {Partial<Fichier>[]} descriptionsFichier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export function trouverFichiersExistants(descriptionsFichier, databaseConnection = directDatabaseConnection){

    return databaseConnection('fichier')
        .select(['DS_checksum', 'nom', 'media_type'])
        .whereIn(
            ['DS_checksum', 'nom', 'media_type'],
            // @ts-ignore
            descriptionsFichier
                .map(({DS_checksum, nom, media_type}) => 
                    [DS_checksum, nom, media_type]
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


/**
 * @param {Fichier['id']} fichierId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 */
export function getFichier(fichierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('fichier')
        .select('*')
        .where('id', fichierId)
        .first()
}

/**
 * @param {Fichier['id']} id 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 */
export function supprimerFichier(id, databaseConnection = directDatabaseConnection){
    return databaseConnection('fichier')
        .delete()
        .where({id})
}