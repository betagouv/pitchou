/** @import { default as AvisExpert, AvisExpertInitializer, AvisExpertMutator } from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */

import { directDatabaseConnection } from '../database.js'
import { ajouterFichier } from './fichier.js'

/**
 * @param { AvisExpertInitializer } avisExpert
 * @param { {nom: string, media_type: string, contenu: Buffer} } [fichierSaisine]
 * @param { {nom: string, media_type: string, contenu: Buffer} } [fichierAvis]
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export async function ajouterAvisExpertAvecFichiers(avisExpert, fichierSaisine, fichierAvis, databaseConnection = directDatabaseConnection) {
    try {
        const fichierSaisineAjoutéP = fichierSaisine ? ajouterFichier(fichierSaisine, databaseConnection) : Promise.resolve()
        const fichierAvisAjoutéP = fichierAvis ? ajouterFichier(fichierAvis, databaseConnection) : Promise.resolve()

        const [fichierSaisineAjouté, fichierAvisAjouté] = await Promise.all([fichierSaisineAjoutéP, fichierAvisAjoutéP])

        return ajouterAvisExpert( {...avisExpert, saisine_fichier: fichierSaisineAjouté?.id ?? undefined, avis_fichier : fichierAvisAjouté?.id ?? undefined}, databaseConnection)
    } catch (e) {
        throw new Error(`Une erreur est survenue lors de l'ajout de l'avis d'expert avec les fichiers de saisine et d'avis : ${e}.`)
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
 * @param { Pick<AvisExpert,"id"> & AvisExpertMutator } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function modifierAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').update(avisExpert).where( {id: avisExpert.id} ).returning(['id'])
}

/**
 * @param { AvisExpert['id'] | AvisExpert['id'][] } avisExpertId
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function supprimerAvisExpert(avisExpertId, databaseConnection = directDatabaseConnection) {
    const idsÀSupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId]
    return databaseConnection('avis_expert').whereIn('id', idsÀSupprimer).delete()
}