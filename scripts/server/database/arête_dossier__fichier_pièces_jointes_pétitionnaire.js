/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {Knex} from 'knex' */

import {directDatabaseConnection} from '../database.js'

/**
 * 
 * @param {Map<DossierDS88444['number'], Fichier['id'][]>} fichiersPiècesJointesPétitionnaireParNuméroDossier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(fichiersPiècesJointesPétitionnaireParNuméroDossier, databaseConnection = directDatabaseConnection){

    throw `
        D'abord, vérifier le bug en créant un dossier DS
    
    Besoin en entrée de la description de toutes les PJ dans DS
        à partir de ça, trouver les fichiers qui sont actuellement en BDD mais ne font plus partie des PJ dans DS
        - supprimer le fichier + supprimer l'arête
        - rajouter les arêtes vers les fichiers nouvellement téléchargés

        c'est téléchargerNouveauxFichiers qui permet les données de description DS
    `

/*
        arêtesFichierDossierPiècesJointePétitionnaires.length > 0
            ? databaseConnection('arête_dossier__fichier_pièces_jointes_pétitionnaire').insert(arêtesFichierDossierPiècesJointePétitionnaires)
            : Promise.resolve([]),

*/

    // Trouver les fichiers déjà en place (pour les supprimer plus bas)
    const fichiersIdPrécédents = await databaseConnection('dossier')
        .select(['espèces_impactées'])
        .whereIn('number_demarches_simplifiées', [...fichiersPiècesJointesPétitionnaireParNuméroDossier.keys()])
        .andWhereNot({'espèces_impactées': null})

    // Associer les nouveaux fichiers espèces impactées au bon dossier
    const updatePs = [...fichiersPiècesJointesPétitionnaireParNuméroDossier].map(([numberDossier, fichierId]) => {
        return databaseConnection('dossier')
            .update({espèces_impactées: fichierId})
            .where({number_demarches_simplifiées: numberDossier})
    })

    // Supprimer les fichiers qui étaient attachés à un dossier et ne sont plus pertinents
    return Promise.all(updatePs).then(() => {
        const fichiersOrphelinsIds = fichiersIdPrécédents
            .map(({espèces_impactées}) => espèces_impactées)

        if(fichiersOrphelinsIds.length >= 1){
            return databaseConnection('fichier')
                .delete()
                .whereIn('id', fichiersOrphelinsIds)
        }
    })

}
