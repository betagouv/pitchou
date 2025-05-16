import {directDatabaseConnection} from '../database.js'
import { makeFichierHash } from '../../../scripts/server/database/fichier.js';

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {default as DécisionAdministrative} from '../../../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from '../../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {TypeDécisionAdministrative} from '../../../scripts/types/API_Pitchou.ts' */
/** @import {DécisionAdministrativeAnnotation88444} from '../../../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */

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
 * @param {Map<Dossier['number_demarches_simplifiées'], DécisionAdministrativeAnnotation88444>} donnéesDécisionAdministrativeParNuméroDossier 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function miseÀJourDécisionsAdministrativesDepuisDS88444(fichierDécisionAdminParNuméroDossier, dossiers, dossierIdByDS_number, donnéesDécisionAdministrativeParNuméroDossier, databaseConnection = directDatabaseConnection){

    /** @type {Map<Dossier['number_demarches_simplifiées'], Dossier>} */
    const dossierByNumber = new Map()
    for(const dossier of dossiers){
        dossierByNumber.set(dossier.number_demarches_simplifiées, dossier)
    }

    // trouver les fichiers AP/AM qui étaient déjà là pour les dossiers avec un fichier AP/AM
    // et l'id de la décision_administative à laquelle il était attaché
    /** @type {Map<Dossier['id'], DécisionAdministrative['id'][]>} */
    const fichiersIdPrécédentsParDossierId = await databaseConnection('décision_administrative')
        .select(['fichier', 'id', 'dossier'])
        .whereIn('dossier', [...dossierIdByDS_number.values()])
        .then(décisionsAdmin => {
            /** @type {typeof fichiersIdPrécédentsParDossierId} */
            const fichiersIdPrécédents = new Map()

            for(const {dossier, fichier} of décisionsAdmin){
                const fichierIdsPourCeFichier = fichiersIdPrécédents.get(dossier) || []
                fichierIdsPourCeFichier.push(fichier)
                fichiersIdPrécédents.set(dossier, fichierIdsPourCeFichier)
            }

            return fichiersIdPrécédents
        })

    console.log('fichiersIdPrécédents', fichiersIdPrécédentsParDossierId)

    /** @type {Partial<DécisionAdministrative>[]} */
    const décisionsAdministrativesÀRajouter = []

    // fabriquer les décision_administrative par dossier
    for(const dossier of dossiers){
        const number_demarches_simplifiées = dossier.number_demarches_simplifiées 

        const id = dossierIdByDS_number.get(Number(number_demarches_simplifiées))

        if(!id){
            throw new TypeError(`dossierIdByDS_number.get(Number(${number_demarches_simplifiées})) est undefined`)
        }

        /** @type {DécisionAdministrativeAnnotation88444 | undefined} */
        const décisionAdministrative = donnéesDécisionAdministrativeParNuméroDossier.get(number_demarches_simplifiées)

        if(!décisionAdministrative){
            throw new TypeError(`Données des annotations de la décision administrative manquante (id pitchou: ${dossier.id} - numéro DS: ${number_demarches_simplifiées})`);
        }

        
        let fichierIds = fichierDécisionAdminParNuméroDossier.get(Number(number_demarches_simplifiées))

        if(fichierIds){
            let [APFichierId, AMFichierId, ...AModifFichierIds] = fichierIds

            /** @type {Partial<DécisionAdministrative> | undefined} */
            let AP = undefined;
            /** @type {Partial<DécisionAdministrative> | undefined} */
            let AM = undefined;
            
            const décision = décisionAdministrative.décision
            // @ts-ignore
            const type = décisionAnnotationDSToDécisionPitchou[décision]

            if(décisionAdministrative.référence_arrêté_préfectoral || décisionAdministrative.date_signature_arrêté_préfectoral){
                AP = {
                    dossier: id,
                    numéro: décisionAdministrative.référence_arrêté_préfectoral,
                    type,
                    date_signature: décisionAdministrative.date_signature_arrêté_préfectoral,
                    fichier: APFichierId
                }
            }

            // S'il n'y a pas d'AP et un fichier unique, ce fichier est en fait un AM
            if(!AP){
                AMFichierId = APFichierId
            }

            if(décisionAdministrative.référence_arrêté_ministériel || décisionAdministrative.date_signature_arrêté_ministériel){
                AM = {
                    dossier: id,
                    numéro: décisionAdministrative.référence_arrêté_ministériel,
                    type,
                    date_signature: décisionAdministrative.date_signature_arrêté_ministériel,
                    fichier: AMFichierId
                    // S'il n'y a qu'un seul fichier, il va dans APFichierId et AMFichierId est undefined
                    // c'est une décision délibérée, ça sera à corriger à la main si besoin
                }
            }

            if(AP){
                décisionsAdministrativesÀRajouter.push(AP)
            }

            if(AM){
                décisionsAdministrativesÀRajouter.push(AM)
            }
        }
        else{
            // ignorer les fichiers associés à ce dossier 
            fichiersIdPrécédentsParDossierId.delete(id)
        }

        
    }

    /** @type {DécisionAdministrative[]} */
    let décisionsAdministrativesInsérées = []

    // Pour chaque dossier, s'il n'y a pas de décision_administrative, en créer une
    // sinon, la mettre à jour avec les données dispo
    // dans tous les cas, recups les id des décision_administrative
    if(décisionsAdministrativesÀRajouter.length >= 1){
        console.log('décisionsAdministrativesÀRajouter', décisionsAdministrativesÀRajouter)

        décisionsAdministrativesInsérées = await databaseConnection('décision_administrative')
            .insert(décisionsAdministrativesÀRajouter)
            .onConflict(['dossier', 'numéro'])
            .merge()
            .returning('*')
    }

    const fichiersIdPrécédentsPourCesDossiersSet = new Set([...fichiersIdPrécédentsParDossierId.values()].flat())
    const fichiersIdEnBDDPourCesDossiersSet = new Set(décisionsAdministrativesInsérées.map(décAdm => décAdm.fichier))

    console.log('fichiersIdPrécédentsPourCesDossiersSet', fichiersIdPrécédentsPourCesDossiersSet)
    console.log('fichiersIdEnBDDPourCesDossiersSet', fichiersIdEnBDDPourCesDossiersSet)

    const fichiersIdsOrphelins = fichiersIdPrécédentsPourCesDossiersSet.difference(fichiersIdEnBDDPourCesDossiersSet)

    
    if(fichiersIdsOrphelins.size >= 1){
        console.log('fichiersIdsOrphelins', fichiersIdsOrphelins)
        return databaseConnection('fichier')
            .delete()
            .whereIn('id', [...fichiersIdsOrphelins])
    }

}
