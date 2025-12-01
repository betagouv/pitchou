/** @import { default as AvisExpert, AvisExpertInitializer } from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */

import { directDatabaseConnection } from '../database.js'
import { ajouterFichier } from './fichier.js'

/**
 * @param { AvisExpertInitializer | AvisExpertInitializer[] } avisExpert
 * @param { {nom: string, media_type: string, contenu: Buffer} } fichierSaisine
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export async function ajouterAvisExpertAvecFichiers(avisExpert, fichierSaisine, databaseConnection = directDatabaseConnection) {
    try {
        const fichierSaisineAjouté = await ajouterFichier(fichierSaisine, databaseConnection)
        
        return ajouterAvisExpert( {... avisExpert, saisine_fichier: fichierSaisineAjouté.id}, databaseConnection)
    } catch (e) {
        throw new Error(`Une erreur est survenue lors de l'ajout du fichier de saisine : ${e}.`)
    }
}


/**
 * @param { AvisExpertInitializer | AvisExpertInitializer[] } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function ajouterAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').insert(avisExpert).returning(['id'])
}

/**
 * @param { AvisExpert['id'] | AvisExpert['id'][] } avisExpertId
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function supprimerAvisExpert(avisExpertId, databaseConnection = directDatabaseConnection) {
    console.log("avisExpertId dans database", avisExpertId)
    const idsÀSupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId]
    return databaseConnection('avis_expert').whereIn('id', idsÀSupprimer).delete()
}