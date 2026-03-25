import { resolve } from 'path';
import {directDatabaseConnection} from '../database.js'

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {DossierDS88444} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Map<DossierDS88444['number'], Fichier['id']>} espècesImpactéesParNuméroDossier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersEspècesImpactéesDepuisDS88444(espècesImpactéesParNuméroDossier, databaseConnection = directDatabaseConnection){
    /** @type {Promise<any>} */
    let miseÀjourFichiersDansDossierP

    // Ce bloc de code a vocation à être supprimé lorsqu'on ne voudra stocker les fichiers des espèces 
    // impactées QUE dans la table déclaration_espèces_impactées
    {    
        // Trouver les fichiers déjà en place (pour les supprimer plus bas)
        const fichiersIdPrécédents = await databaseConnection('dossier')
            .select(['espèces_impactées'])
            .whereIn('number_demarches_simplifiées', [...espècesImpactéesParNuméroDossier.keys()])
            .andWhereNot({'espèces_impactées': null})

        // Associer les nouveaux fichiers espèces impactées au bon dossier
        const updatePs = [...espècesImpactéesParNuméroDossier].map(([numberDossier, fichierId]) => {
            return databaseConnection('dossier')
                .update({espèces_impactées: fichierId})
                .where({number_demarches_simplifiées: numberDossier})
        })

        // Supprimer les fichiers qui étaient attachés à un dossier et ne sont plus pertinents
        miseÀjourFichiersDansDossierP = Promise.all(updatePs).then(() => {
            const fichiersOrphelinsIds = fichiersIdPrécédents
                .map(({espèces_impactées}) => espèces_impactées)

            if(fichiersOrphelinsIds.length >= 1){
                return databaseConnection('fichier')
                    .delete()
                    .whereIn('id', fichiersOrphelinsIds)
            }
        })
    }

    // Trouver les fichiers déjà en place (pour les supprimer plus bas)
    const fichiersIdPrécédents = await databaseConnection('déclaration_espèces_impactées')
        .select(['fichier'])
        .join('dossier', {'dossier.id': 'déclaration_espèces_impactées.dossier'})
        .whereIn('dossier.number_demarches_simplifiées', [...espècesImpactéesParNuméroDossier.keys()]);

    // // Associer les nouveaux fichiers espèces impactées au bon dossier
    // const updatePs = [...espècesImpactéesParNuméroDossier].map(([numberDossier, fichierId]) => {
    //     return databaseConnection('déclaration_espèces_impactées')
    //         .join('dossier', {'dossier.id': 'déclaration_espèces_impactées.dossier'})
    //         .insert({fichier: fichierId})
    //         .where({'dossier.number_demarches_simplifiées': numberDossier});
    // })
    return miseÀjourFichiersDansDossierP
    
}
