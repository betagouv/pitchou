import {directDatabaseConnection} from '../database.js'

import {ajouterFichier, supprimerFichier} from './fichier.js'

/** @import {default as Fichier} from '../../../scripts/types/database/public/Fichier.ts' */
/** @import {default as Dossier} from '../../../scripts/types/database/public/Dossier.ts' */
/** @import {default as CapDossier} from '../../../scripts/types/database/public/CapDossier.ts' */
/** @import {default as DécisionAdministrative} from '../../../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import {DécisionAdministrativePourTransfer, FrontEndDécisionAdministrative} from '../../../scripts/types/API_Pitchou.ts' */

/** @import {knex, Knex} from 'knex' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;


/**
 * 
 * @param {DécisionAdministrativePourTransfer} décision 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @returns {Promise<Fichier['id']>}
 */
export async function ajouterDécisionAdministrativeAvecFichier(décision, databaseConnection = directDatabaseConnection){
    const {id, numéro, type, date_signature, date_fin_obligations, dossier} = décision

    /** @type {Partial<DécisionAdministrative>} */
    const décisionAdministrativeBDD = {
        id, numéro, type, date_signature, date_fin_obligations, dossier
    }

    if(décision.fichier_base64){
        const {nom, media_type, contenuBase64} = décision.fichier_base64

        const contenu = Buffer.from(contenuBase64, 'base64')

        /** @type {Partial<Fichier>} */
        const fichierBDD = {
            nom,
            media_type,
            contenu
        }

        await ajouterFichier(fichierBDD, databaseConnection).then(fichier => {
            décisionAdministrativeBDD.fichier = fichier.id
        })
    }

    return databaseConnection('décision_administrative')
        .insert(décisionAdministrativeBDD)
        .returning(['id'])
        .then(d => d[0].id)
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