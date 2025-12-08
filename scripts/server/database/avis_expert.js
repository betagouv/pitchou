/** @import { default as AvisExpert, AvisExpertInitializer, AvisExpertMutator } from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */

import { directDatabaseConnection } from '../database.js'
import { ajouterFichier } from './fichier.js'

/**
 * @param { AvisExpertInitializer | {id: string} & AvisExpertMutator } avisExpert
 * @returns {boolean}
 */
export function estUnAvisExpertÀModifier(avisExpert) {
    return avisExpert.id !== undefined
}

/**
 * @param { AvisExpertInitializer | {id: string} & AvisExpertMutator } avisExpert
 * @param { {nom: string, media_type: string, contenu: Buffer} } [fichierSaisine]
 * @param { {nom: string, media_type: string, contenu: Buffer} } [fichierAvis]
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export async function ajouterOuModifierAvisExpertAvecFichiers(avisExpert, fichierSaisine, fichierAvis, databaseConnection = directDatabaseConnection) {
    try {
        const fichierSaisineAjoutéP = fichierSaisine ? ajouterFichier(fichierSaisine, databaseConnection) : Promise.resolve()
        const fichierAvisAjoutéP = fichierAvis ? ajouterFichier(fichierAvis, databaseConnection) : Promise.resolve()

        const [fichierSaisineAjouté, fichierAvisAjouté] = await Promise.all([fichierSaisineAjoutéP, fichierAvisAjoutéP])

        if (estUnAvisExpertÀModifier(avisExpert)) {
            /** @type {{id: string} & AvisExpertMutator } */
            //@ts-ignore
            const avisExpertÀMaj = avisExpert

            // // Supprimer les fichiers orphelins
            // const fichiersAvisExpertÀMaj = await getFichiersAvisSaisineAvisExpert(avisExpertÀMaj.id, databaseConnection)
            // const fichierSaisineIdPrécédent = fichiersAvisExpertÀMaj.length === 1 && fichiersAvisExpertÀMaj[0].saisine_fichier
            // const fichierAvisIdPrécédent = fichiersAvisExpertÀMaj.length === 1 && fichiersAvisExpertÀMaj[0].saisine_fichier

            return modifierAvisExpert(
            {
                ...avisExpertÀMaj,
                id: avisExpertÀMaj.id,
                saisine_fichier: fichierSaisineAjouté?.id ?? undefined,
                avis_fichier: fichierAvisAjouté?.id ?? undefined,
            },
            databaseConnection
            )

        } else {
            /** @type {AvisExpertInitializer} */
            //@ts-ignore
            const avisExpertÀInsérer = avisExpert

            return ajouterAvisExpert( {...avisExpertÀInsérer, saisine_fichier: fichierSaisineAjouté?.id ?? undefined, avis_fichier : fichierAvisAjouté?.id ?? undefined}, databaseConnection)
        }
    } catch (e) {
        throw new Error(`Une erreur est survenue lors de l'ajout ou de la modification de l'avis d'expert avec les fichiers de saisine et d'avis : ${e}.`)
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
 * @param { {id: string} & AvisExpertMutator } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function modifierAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').update(avisExpert).where( { id: avisExpert.id } ).returning(['id'])
}

/**
 * @param { AvisExpert['id'] | AvisExpert['id'][] } avisExpertId
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function supprimerAvisExpert(avisExpertId, databaseConnection = directDatabaseConnection) {
    const idsÀSupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId]
    return databaseConnection('avis_expert').whereIn('id', idsÀSupprimer).delete()
}

/**
 * 
 * @param { AvisExpert['id'] } avisExpertId
 * @param { Knex.Transaction | Knex } [databaseConnection]
 * @returns { Promise<Pick<AvisExpert, "saisine_fichier" | "avis_fichier">[]> }
 */
export function getFichiersAvisSaisineAvisExpert(avisExpertId, databaseConnection = directDatabaseConnection) {
    return databaseConnection('avis_expert').where({'id': avisExpertId}).select('saisine_fichier', 'avis_fichier')
}