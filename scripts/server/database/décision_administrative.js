import {directDatabaseConnection} from '../database.js'
import { makeFichierHash } from '../../../scripts/server/database/fichier.js';

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/**
 * 
 * @param {Map<DossierDS88444['number'], Partial<Fichier>[]>} espècesImpactéesParNuméroDossier
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function miseÀJourDécisionsAdministrativesDepuisDS88444(espècesImpactéesParNuméroDossier, databaseConnection = directDatabaseConnection){

    // trouver les fichiers AP/AM qui étaient déjà là pour les dossiers avec un fichier AP/AM
    // et l'id de la décision_administative à laquelle il était attaché

    // Pour chaque dossier, s'il n'y a pas de décision_administrative, en créer une
    // sinon, la mettre à jour avec les données dispo
    // dans tous les cas, recups les id des décision_administrative


    // Rajouter les nouveaux fichiers
    // recups leurs IDs pour les ré-associer au dossier

    // 







    // Trouver les fichiers déjà en place (pour les supprimer plus bas)
    const fichiersIdPrécédents = await databaseConnection('dossier')
        .select(['espèces_impactées'])
        .whereIn('number_demarches_simplifiées', [...espècesImpactéesParNuméroDossier.keys()])
        .andWhereNot({'espèces_impactées': null})

    // Insérer les nouveaux fichiers
    /** @type {Fichier[]} */
    const fichiersInsérés = await databaseConnection('fichier')
        // ignorer les fichiers autres que le premier fichier d'espèces impactées
        .insert([...espècesImpactéesParNuméroDossier.values()].map(fichiersEspèces => fichiersEspèces[0]))
        .returning(['id', 'DS_checksum', 'DS_createdAt', 'nom', 'media_type'])

    // Associer les nouveaux fichiers au bon dossier
    /** @type {Map<ReturnType<makeFichierHash>, Fichier['id'] >} */
    const hashToFichierId = new Map()
    for(const fichier of fichiersInsérés){
        const {id} = fichier
        const hash = makeFichierHash(fichier)

        hashToFichierId.set(hash, id)
    }

    const updatePs = [...espècesImpactéesParNuméroDossier].map(([numberDossier, fichiers]) => {
        // ignorer les fichiers autres que le premier fichier d'espèces impactées
        const fichier = fichiers[0]

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
