/** @import {default as Fichier} from '../types/database/public/Fichier.ts' */
/** @import { Knex } from 'knex' **/

import * as db from './database/fichier'
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
    if (storeInObjectStorage) {
        return objectStorage.ajouterFichier(fichier)
            .then((taille) => db.ajouterFichier({...fichier, contenu: null, taille}, databaseConnection))
    } else {
        return db.ajouterFichier(fichier, databaseConnection)
    }
}

/**
 * @param {Fichier['id']} id
 * @param {boolean} [storeInObjectStorage]
 * @param {Knex.Transaction | Knex} [databaseConnection]
 */
export async function supprimerFichier(id, storeInObjectStorage = true, databaseConnection = directDatabaseConnection){
    if (storeInObjectStorage) {
        return db.supprimerFichier(id, databaseConnection)
            .then(objectStorage.supprimerFichier)
    } else {
        return db.supprimerFichier(id, databaseConnection)
    }
}
