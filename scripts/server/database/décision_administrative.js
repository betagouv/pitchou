import {directDatabaseConnection} from '../database.js'
import { makeFichierHash } from '../../../scripts/server/database/fichier.js';

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from '../../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {TypeDécisionAdministrative} from '../../../scripts/types/API_Pitchou.ts' */

/** @import {Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;

/** @type { { [key in (AnnotationsPriveesDemarcheSimplifiee88444['Décision'])]: TypeDécisionAdministrative } } */
const décisionAnnotationDSToDécisionPitchou = {
    "AP dérogation" : 'Arrêté dérogation',
    "AP modificatif" : 'Arrêté modificatif',
    "AP Refus" : 'Arrêté refus',
}


/**
 * 
 * @param {Map<DossierDS88444['number'], Fichier['id'][]>} fichierDécisionAdminParNuméroDossier
 * @param {Dossier[]} dossiers
 * @param {Map<DossierDS88444['number'], Dossier['id']>} dossierIdByDS_number
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function miseÀJourDécisionsAdministrativesDepuisDS88444(fichierDécisionAdminParNuméroDossier, dossiers, dossierIdByDS_number, databaseConnection = directDatabaseConnection){

    const dossierByNumber = new Map()
    for(const dossier of dossiers){
        dossierByNumber.set(dossier.number_demarches_simplifiées, dossier)
    }

    // trouver les fichiers AP/AM qui étaient déjà là pour les dossiers avec un fichier AP/AM
    // et l'id de la décision_administative à laquelle il était attaché
    const fichiersIdPrécédents = await databaseConnection('dossier')
        .select(['fichier'])
        .leftJoin('décision_administrative', {'décision_administrative.dossier': 'dossier.id'})

    // fabriquer les décision_administrative par dossier
    for(const dossier of dossiers){
        // @ts-ignore
        const id = dossierIdByDS_number.get(dossier.number_demarches_simplifiées)
        // @ts-ignore
        const [APFichierId, AMFichierId, ...AModifFichierIds] = fichierDécisionAdminParNuméroDossier.get(dossier.number_demarches_simplifiées)  

        /*
            Si y'a 1 fichier et des données d'AP
            fichier va dans l'AP

            Si y'a 1 fichier et des données d'AM
            fichier va dans l'AM

            Si y'a 1 fichier et des données des 2
            ... mettre le fichier dans AP et rien sur l'AM

            Si y'a 2 fichiers et les deux
            => AP puis AM

         */

        /** @type {DécisionAdministrative} */
        let AP;
        /** @type {DécisionAdministrative} */
        let AM;
        
        const décision = dossier.historique_décision
        // @ts-ignore
        const type = décisionAnnotationDSToDécisionPitchou[décision]

        if(dossier.historique_référence_arrêté_préfectoral || dossier.historique_date_signature_arrêté_préfectoral){
            AP = {
                dossier: id,
                numéro: dossier.historique_référence_arrêté_préfectoral,
                type,
                date_signature: dossier.historique_date_signature_arrêté_préfectoral,
                fichier: APFichierId
            }
        }

        if(dossier.historique_référence_arrêté_ministériel || dossier.historique_date_signature_arrêté_ministériel){
            throw `ici`
            const fichier = 

            AM = {
                dossier: id,
                numéro: dossier.historique_référence_arrêté_ministériel,
                type,
                date_signature: dossier.historique_date_signature_arrêté_ministériel,
                fichier: AMFichierId || APFichierId
            }
        }
 
    }



    // Pour chaque dossier, s'il n'y a pas de décision_administrative, en créer une
    // sinon, la mettre à jour avec les données dispo
    // dans tous les cas, recups les id des décision_administrative
    await databaseConnection('décision_administrative')
        .insert()
        .onConflict()
        .merge()


    // Rajouter les nouveaux fichiers
    // recups leurs IDs pour les ré-associer au dossier


    // Trouver les fichiers déjà en place (pour les supprimer plus bas)






    const updatePs = [...fichierDécisionAdminParNuméroDossier].map(([numberDossier, fichierIds]) => {
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
