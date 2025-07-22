import {directDatabaseConnection} from '../database.js'

import {ajouterFichier, supprimerFichier} from './fichier.js'

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {default as CapDossier} from '../../../scripts/types/database/public/CapDossier.ts' */
/** @import {default as DécisionAdministrative} from '../../../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import {DossierDS88444} from '../../../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444} from '../../../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {DécisionAdministrativePourTransfer, FrontEndDécisionAdministrative, TypeDécisionAdministrative} from '../../../scripts/types/API_Pitchou.ts' */
/** @import {DécisionAdministrativeAnnotation88444} from '../../../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */

/** @import {knex, Knex} from 'knex' */

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
 * @param {Omit<DécisionAdministrative, 'id'> | Omit<DécisionAdministrative, 'id'>[]} décisions 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Map<Dossier['id'], Fichier['id'][]>>}
 */
export function ajouterDécisionsAdministratives(décisions, databaseConnection = directDatabaseConnection){
    if(!Array.isArray(décisions)){
        décisions = [décisions]
    }

    return databaseConnection('décision_administrative')
        .insert(décisions)
}


/**
 * 
 * @param {Dossier['id'][]} dossierIds 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Map<Dossier['id'], Fichier['id'][]>>}
 */
function getFichierIdByDossierId(dossierIds, databaseConnection = directDatabaseConnection){

    return databaseConnection('décision_administrative')
        .select(['fichier', 'id', 'dossier'])
        .whereIn('dossier', dossierIds)
        .then((/** @type {DécisionAdministrative[]} */ décisionsAdmin) => {
            /** @type {Awaited<ReturnType<getFichierIdByDossierId>>} */
            const fichiersIdPrécédents = new Map()

            for(const {dossier, fichier} of décisionsAdmin){
                const fichierIdsPourCeFichier = fichiersIdPrécédents.get(dossier) || []
                
                if(fichier !== null)
                    fichierIdsPourCeFichier.push(fichier)
                
                if(fichierIdsPourCeFichier.length >= 1)
                    fichiersIdPrécédents.set(dossier, fichierIdsPourCeFichier)
            }

            return fichiersIdPrécédents
        })
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

    const dossiersIdPourLesquelsChercherDesFichiersOrphelins = [...dossierIdByDS_number.values()]

    // trouver les fichiers AP/AM qui étaient déjà là pour les dossiers avec un fichier AP/AM
    // et l'id de la décision_administative à laquelle il était attaché
    /** @type {Map<Dossier['id'], Fichier['id'][]>} */
    const fichiersIdPrécédentsParDossierId = await getFichierIdByDossierId(dossiersIdPourLesquelsChercherDesFichiersOrphelins, databaseConnection)

    //console.log('fichiersIdPrécédents', fichiersIdPrécédentsParDossierId)

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
            //@ts-expect-error ignorer AModifFichierIds délibérément
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


    // Pour chaque dossier, s'il n'y a pas de décision_administrative, en créer une
    // sinon, la mettre à jour avec les données dispo
    // dans tous les cas, recups les id des décision_administrative
    if(décisionsAdministrativesÀRajouter.length >= 1){
        //console.log('décisionsAdministrativesÀRajouter', décisionsAdministrativesÀRajouter)

        await databaseConnection('décision_administrative')
            .insert(décisionsAdministrativesÀRajouter)
            .onConflict(['dossier', 'numéro'])
            .merge(['type', 'date_signature', 'fichier'])
            .returning('*')
    }

    /** @type {Map<Dossier['id'], Fichier['id'][]>} */
    const fichiersIdParDossierIdAprèsInsertion = await getFichierIdByDossierId(dossiersIdPourLesquelsChercherDesFichiersOrphelins, databaseConnection)

    /** @type {Set<Fichier['id']>} */
    const fichiersIdPrécédentsPourCesDossiersSet = new Set([...fichiersIdPrécédentsParDossierId.values()].flat())
    /** @type {Set<Fichier['id']>} */
    const fichiersIdAprèsInsertion = new Set([...fichiersIdParDossierIdAprèsInsertion.values()].flat())

    //console.log('fichiersIdPrécédentsPourCesDossiersSet', fichiersIdPrécédentsPourCesDossiersSet)
    //console.log('fichiersIdAprèsInsertion', fichiersIdAprèsInsertion)

    const fichiersIdsOrphelins = fichiersIdPrécédentsPourCesDossiersSet.difference(fichiersIdAprèsInsertion)

    if(fichiersIdsOrphelins.size >= 1){
        //console.log('fichiersIdsOrphelins', fichiersIdsOrphelins)
        return databaseConnection('fichier')
            .delete()
            .whereIn('id', [...fichiersIdsOrphelins])
    }
}

/**
 * 
 * @param {Dossier['id']} dossierId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<DécisionAdministrative[]>}
 */
export function getDécisionAdministratives(dossierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('décision_administrative')
        .select('*')
        .where({dossier: dossierId})
}

/**
 * Récupère les décisions administratives pour chaque dossier
 * 
 * @param {CapDossier['cap']} cap_dossier 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<FrontEndDécisionAdministrative[]>}
 */
export function getDécisionsAdministratives(cap_dossier, databaseConnection = directDatabaseConnection){
    return databaseConnection('décision_administrative')
        .select('décision_administrative.*')
        .join('arête_groupe_instructeurs__dossier', {'arête_groupe_instructeurs__dossier.dossier': 'décision_administrative.dossier'})
        .join(
            'arête_cap_dossier__groupe_instructeurs', 
            {'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs': 'arête_groupe_instructeurs__dossier.groupe_instructeurs'}
        )
        .where({"arête_cap_dossier__groupe_instructeurs.cap_dossier": cap_dossier})
}

/**
 * 
 * @param {DécisionAdministrativePourTransfer} décisionAdministrative 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function modifierDécisionAdministrative(décisionAdministrative, databaseConnection = directDatabaseConnection){
    const {id, numéro, type, date_signature, date_fin_obligations, dossier} = décisionAdministrative

    if(!id){
        throw new TypeError(`id manquant dans la décision administrative ${décisionAdministrative.numéro}, ${décisionAdministrative.date_signature}, ${décisionAdministrative.type}`)
    }

    /** @type {Partial<DécisionAdministrative>} */
    const décisionAdministrativeBDD = {
        id, numéro, type, date_signature, date_fin_obligations, dossier
    }


    /** @type {Promise<any>} */
    let décisionAdministrativePrêteP = Promise.resolve();

    /** @type {Promise<Fichier['id'] | undefined>} */
    let fichierIdPrécédentP = Promise.resolve(undefined);



    if(décisionAdministrative.fichier_base64){
        const {nom, media_type, contenuBase64} = décisionAdministrative.fichier_base64

        const contenu = Buffer.from(contenuBase64, 'base64')

        /** @type {Partial<Fichier>} */
        const fichierBDD = {
            nom,
            media_type,
            contenu
        }

        décisionAdministrativePrêteP = ajouterFichier(fichierBDD, databaseConnection).then(fichier => {
            décisionAdministrativeBDD.fichier = fichier.id
        })

        fichierIdPrécédentP = databaseConnection('décision_administrative')
            .select(['fichier'])
            .where({id})
            .then(décisions => décisions[0].fichier)
    }


    await décisionAdministrativePrêteP
    const décisionAdministrativeÀJourP = databaseConnection('décision_administrative')
        .update(décisionAdministrativeBDD)
        .where({id: décisionAdministrativeBDD.id})

    return Promise.all([fichierIdPrécédentP, décisionAdministrativeÀJourP])
        .then(([fichierIdPrécédent]) => {
            if(fichierIdPrécédent){
                return supprimerFichier(fichierIdPrécédent, databaseConnection)
            }
        })

}

/**
 * 
 * @param {DécisionAdministrative['id']} id 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export function supprimerDécisionAdministrative(id, databaseConnection = directDatabaseConnection){
    return databaseConnection('décision_administrative')
        .delete()
        .where({id})
}