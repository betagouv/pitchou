/** @import {default as Fichier} from '../types/database/public/Fichier.ts' */
/** @import {StorageOptions} from '../types/fichier.ts' */

import * as db from './database/fichier.js'
import * as objectStorage from './object-storage/fichier.js'
import { directDatabaseConnection } from './database.js'


/**
 *
 * @param {Partial<Fichier>} fichier
 * @param {StorageOptions} [options]
 * @returns {Promise<Partial<Fichier>>}
 */
export async function ajouterFichier(
    fichier,
    {
        storageBackend = 'objectStorage',
        databaseConnection = directDatabaseConnection
    } = {}
){
    fichier.taille = fichier.contenu?.byteLength

    if (storageBackend === 'objectStorage') {
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
 * @param {StorageOptions} [options]
 * @returns {Promise<Partial<Fichier>>}
 */
export async function supprimerFichier(
    id,
    {
        storageBackend = 'objectStorage',
        databaseConnection = directDatabaseConnection
    } = {}
){
    if (storageBackend === 'objectStorage') {
        const fichier = await db.supprimerFichier(id, databaseConnection)
        await objectStorage.supprimerFichier(fichier)
        return fichier
    } else {
        return db.supprimerFichier(id, databaseConnection)
    }
}

/**
 * @param {Fichier['id'][]} ids
 * @param {StorageOptions} [options]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export async function supprimerFichiers(
    ids,
    {
        storageBackend = 'objectStorage',
        databaseConnection = directDatabaseConnection
    } = {}
){
    if (storageBackend === 'objectStorage') {
        const fichiers = await db.supprimerFichiers(ids, databaseConnection)
        await objectStorage.supprimerFichiers(fichiers)
        return fichiers
    } else {
        return db.supprimerFichiers(ids, databaseConnection)
    }
}
