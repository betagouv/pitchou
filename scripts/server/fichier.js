/** @import {default as Fichier} from '../types/database/public/Fichier.ts' */
/** @import { Knex } from 'knex' **/

import * as db from './database/fichier.js'
import * as objectStorage from './object-storage/fichier.js'
import { directDatabaseConnection } from './database.js'


/**
 *
 * @param {Partial<Fichier>} fichier
 * @param {boolean} [storeInObjectStorage]
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>>}
 */
export async function ajouterFichier(fichier, storeInObjectStorage = true, databaseConnection = directDatabaseConnection){
    fichier.taille = fichier.contenu?.byteLength

    if (storeInObjectStorage) {
        const contenu = fichier.contenu
        const nouveauFichier = await db.ajouterFichier(
            {...fichier, contenu: null },
            databaseConnection
        )
        await objectStorage.ajouterFichier({ ...nouveauFichier, contenu })
        return nouveauFichier
    } else {
        return db.ajouterFichier(fichier, databaseConnection)
    }
}

/**
 * @param {Fichier['id']} id
 * @param {boolean} [storeInObjectStorage]
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>>}
 */
export async function supprimerFichier(id, storeInObjectStorage = true, databaseConnection = directDatabaseConnection){
    if (storeInObjectStorage) {
        const fichier = await db.supprimerFichier(id, databaseConnection)
        await objectStorage.supprimerFichier(fichier)
        return fichier
    } else {
        return db.supprimerFichier(id, databaseConnection)
    }
}
