import {directDatabaseConnection} from '../database.js'

import { makeFichierHash } from '../../../scripts/server/database/fichier.js';


/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
//@ts-expect-error https://github.com/microsoft/TypeScript/issues/60908
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {Knex} from 'knex' */

/**
 * 
 * @param {Partial<Fichier>[]} descriptionsEspècesImpactées
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Partial<Fichier>[]>}
 */
export function trouverFichiersEspècesImpactéesExistants(descriptionsEspècesImpactées, databaseConnection = directDatabaseConnection){

    return databaseConnection('fichier')
        .select(['DS_checksum', 'DS_createdAt', 'nom', 'media_type'])
        .whereIn(
            ['DS_checksum', 'DS_createdAt', 'nom', 'media_type'],
            // @ts-ignore
            descriptionsEspècesImpactées
                .map(({DS_checksum, DS_createdAt, nom, media_type}) => 
                    [DS_checksum, DS_createdAt, nom, media_type]
                )
        )

}


/**
 * 
 * @param {Map<DossierDS88444['number'], Partial<Fichier>>} espècesImpactéesParNuméroDossier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function ajouterFichiersEspècesImpactéesDepuisDS88444(espècesImpactéesParNuméroDossier, databaseConnection = directDatabaseConnection){

    // Trouver les fichiers déjà en place (pour les supprimer plus bas)
    const fichiersIdPrécédents = await databaseConnection('dossier')
        //.select(['espèces_impactées'])
        .select(['*'])
        .whereIn('number_demarches_simplifiées', [...espècesImpactéesParNuméroDossier.keys()])
        .andWhereNot({'espèces_impactées': null})

    // Insérer les nouveaux fichiers
    /** @type {Fichier[]} */
    const fichiersInsérés = await databaseConnection('fichier')
        .insert([...espècesImpactéesParNuméroDossier.values()])
        .onConflict('dossier')
        .merge()
        .returning(['id', 'DS_checksum', 'DS_createdAt', 'nom', 'media_type'])

    // Associer les nouveaux fichiers au bon dossier
    /** @type {Map<ReturnType<makeFichierHash>, Fichier['id'] >} */
    const hashToFichierId = new Map()
    for(const fichier of fichiersInsérés){
        const {id} = fichier
        const hash = makeFichierHash(fichier)

        hashToFichierId.set(hash, id)
    }

    const updatePs = [...espècesImpactéesParNuméroDossier].map(([numberDossier, fichier]) => {
        const hash = makeFichierHash(fichier)
        const fichierId = hashToFichierId.get(hash)

        if(!hash){
            throw new Error(`hash non reconnu. Hash : '${hash}', hashs possibles : ${[...hashToFichierId.keys()].join(', ')}`)
        }

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
