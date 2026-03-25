
import {directDatabaseConnection} from '../database.js'

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as DéclarationEspècesImpactées, DClarationEspCesImpactEsInitializer} from '../../../scripts/types/database/public/DéclarationEspècesImpactées.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDS88444} from '../../types/démarche-numérique/apiSchema.ts' */
/** @import {Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Map<DossierDS88444['number'], Fichier['id']>} espècesImpactéesParNuméroDossier
 * @param {Map<DossierDS88444['number'], Dossier['id']>} dossierIdByDS_number
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function synchroniserFichiersEspècesImpactéesDepuisDS88444(espècesImpactéesParNuméroDossier, dossierIdByDS_number, databaseConnection = directDatabaseConnection){
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

    const espècesImpactéesIdDossier = [...espècesImpactéesParNuméroDossier.keys()].map((numéroDossierDN) => {
        const idDossier = dossierIdByDS_number.get(numéroDossierDN)
        if (idDossier) {
            return idDossier
        } else {
            throw new Error(`Aucun id de dossier ne correspond au numéro DN : ${numéroDossierDN}`)
        }
    })

    // Trouver les déclarations espèces impactées déjà en place (pour les supprimer plus bas)
    /** @type {DéclarationEspècesImpactées['id'][]} */
    const déclarationsEspècesImpactéesPrécédentes = (
        await databaseConnection('déclaration_espèces_impactées')
            .select(['id'])
            .whereIn('dossier', espècesImpactéesIdDossier)
        ).map(({id}) => id)

    // Supprimer les anciennes déclarations espèces impactées.
    // Le fichier des espaces impactées de la table fichier et lignes des espèces impactées dans la table espèce_impactée
    // qui lui sont liées seront supprimés en cascade grâce au trigger mis en place.
    await databaseConnection('déclaration_espèces_impactées')
        .delete()
        .whereIn('id', déclarationsEspècesImpactéesPrécédentes)

    // Ajouter les nouvelles déclarations espèces impactées
    /** @type {DClarationEspCesImpactEsInitializer[]} */
    const déclarationsEspècesImpactéesÀInsérer = [...espècesImpactéesParNuméroDossier].map(([numéroDossierDN, fichierId]) => {
            const dossierId = dossierIdByDS_number.get(numéroDossierDN)
            if (dossierId) {
                return {dossier: dossierId, fichier: fichierId}
            } else {
                throw new Error(`Aucun id de dossier ne correspond au numéro DN : ${numéroDossierDN}`)
            }
    })
    const miseÀjourFichiersDansDéclarationsEspècesImpactéesP = databaseConnection('déclaration_espèces_impactées')
        .insert(déclarationsEspècesImpactéesÀInsérer)

    return Promise.all([miseÀjourFichiersDansDossierP, miseÀjourFichiersDansDéclarationsEspècesImpactéesP])
    
}
