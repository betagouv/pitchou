/** @import { default as AvisExpert, AvisExpertInitializer, AvisExpertMutator } from '../../types/database/public/AvisExpert.ts' */
/** @import { Knex } from 'knex' */
/** @import { PickNonNullable } from '../../types/tools' */
/** @import Fichier from '../../types/database/public/Fichier.ts' */

import { directDatabaseConnection } from '../database.js'
import { ajouterFichier, supprimerFichier } from '../fichier.js'

/**
 * @param { AvisExpertInitializer | {id: string} & AvisExpertMutator } avisExpert
 * @returns {boolean}
 */
function estUnAvisExpertÀModifier(avisExpert) {
    return avisExpert.id !== undefined
}

/**
 * @param { AvisExpertInitializer | {id: string} & AvisExpertMutator } avisExpert
 * @param { PickNonNullable<Fichier, 'nom' | 'contenu' | 'media_type'> } [fichierSaisine]
 * @param { PickNonNullable<Fichier, 'nom' | 'contenu' | 'media_type'> } [fichierAvis]
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export async function ajouterOuModifierAvisExpertAvecFichiers(avisExpert, fichierSaisine, fichierAvis, databaseConnection = directDatabaseConnection) {
    try {
        const fichierSaisineAjoutéP = fichierSaisine ? ajouterFichier(fichierSaisine, true, databaseConnection) : Promise.resolve()
        const fichierAvisAjoutéP = fichierAvis ? ajouterFichier(fichierAvis, true, databaseConnection) : Promise.resolve()

        const [fichierSaisineAjouté, fichierAvisAjouté] = await Promise.all([fichierSaisineAjoutéP, fichierAvisAjoutéP])

        if (estUnAvisExpertÀModifier(avisExpert)) {
            /** @type {{id: string} & AvisExpertMutator } */
            //@ts-ignore
            const avisExpertÀMaj = avisExpert

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

            return ajouterAvisExpert(
                {
                    ...avisExpertÀInsérer,
                    saisine_fichier: fichierSaisineAjouté?.id ?? undefined,
                    avis_fichier : fichierAvisAjouté?.id ?? undefined
                },
                databaseConnection
            )
        }
    } catch (e) {
        throw new Error(`Une erreur est survenue lors de l'ajout ou de la modification de l'avis d'expert avec les fichiers de saisine et d'avis : ${e}.`)
    }
}

/**
 * @param { AvisExpertInitializer | {id: string} & AvisExpertMutator } avisExpert
 * @param { Knex.Transaction | Knex } [databaseConnection]
 */
export function ajouterOuModifierAvisExpert(avisExpert, databaseConnection = directDatabaseConnection) {
    if (estUnAvisExpertÀModifier(avisExpert)) {
        /** @type {{id: string} & AvisExpertMutator } */
        //@ts-ignore
        const avisExpertÀMaj = avisExpert
        return modifierAvisExpert(avisExpertÀMaj, databaseConnection)
    } else {
        /** @type {AvisExpertInitializer} */
        //@ts-ignore
        const avisExpertÀInsérer = avisExpert
        return ajouterAvisExpert(avisExpertÀInsérer, databaseConnection)
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
export async function supprimerAvisExpert(avisExpertId, databaseConnection = directDatabaseConnection) {
    const idsÀSupprimer = Array.isArray(avisExpertId) ? avisExpertId : [avisExpertId]

    const fichierIDs = await databaseConnection('avis_expert')
        .whereIn('id', idsÀSupprimer)
        .delete()
        .returning(['saisine_fichier', 'avis_fichier'])
        .then(avis => {
            return avis
                .flatMap(avis => [avis.saisine_fichier, avis.avis_fichier])
                .filter(fichier => fichier !== null)
        })

    return Promise.all(
        fichierIDs.map(fichierId => supprimerFichier(fichierId, true, databaseConnection))
    )
}
