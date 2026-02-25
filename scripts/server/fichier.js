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

        // Crée un nouveau SAVEPOINT si une transaction existe déjà
        // Dans ce cas rollback() revient au savepoint et commit() RELEASE le SAVEPOINT
        const transaction = await databaseConnection.transaction()

        const nouveauFichier = await db.ajouterFichier(
            {...fichier, contenu: null },
            transaction
        )

        try  {
            await objectStorage.ajouterFichier({ ...nouveauFichier, contenu })
        } catch (e) {
            console.warn(`Erreur lors de la création du fichier ${fichier.nom} dans le stockage objet: ${e}`)
            await transaction.rollback()
            throw e
        }

        await transaction.commit()

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
        try {
            await objectStorage.supprimerFichier(fichier)
        } catch (e) {
            console.warn(`Erreur lors de la suppression du fichier ${id} dans le stockage objet: ${e}`)
        }
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
        try {
            await objectStorage.supprimerFichiers(fichiers)
        } catch (e) {
            console.warn(`Erreur lors de la suppression des fichiers ${ids.join(', ')} dans le stockage objet: ${e}`)
        }
        return fichiers
    } else {
        return db.supprimerFichiers(ids, databaseConnection)
    }
}
