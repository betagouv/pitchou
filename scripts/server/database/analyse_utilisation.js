/** @import {default as Dossier, DossierId} from '../../types/database/public/Dossier.ts' */
/** @import {default as Personne} from '../../types/database/public/Personne.ts' */
/** @import {default as ÉvènementPhaseDossier} from '../../types/database/public/ÉvènementPhaseDossier.ts' */
/** @import {default as DécisionAdministrative} from '../../types/database/public/DécisionAdministrative.ts' */
/** @import {default as Contrôle} from '../../types/database/public/Contrôle.ts' */
/** @import ArTePersonneSuitDossier from '../../types/database/public/ArêtePersonneSuitDossier.ts' */


import {directDatabaseConnection} from '../database.js'

/**
 * 
 * @returns {Promise<Map<NonNullable<Personne['email']>, Date>>}
 */
export async function getDateDernièreUtilisationParInstructrice(databaseConnection = directDatabaseConnection){

    //throw 'recups la Map<email, date de dépôt>'

    // date de dépôt
    const emailsDateDépôts = await databaseConnection('personne')
        .select(['email'])
        .max('date_dépôt as dépôt_le_plus_récent')
        .join(
            'arête_personne_suit_dossier', 
            {'arête_personne_suit_dossier.personne': 'personne.id'}
        )
        .join(
            'dossier',
            {'dossier.id': 'arête_personne_suit_dossier.dossier'}
        )
        .groupBy('email')


    /** @type {Awaited<ReturnType<getDateDernièreUtilisationParInstructrice>>} */
    const dateDernièreUtilisationParInstructrice = new Map(
        emailsDateDépôts.map(({email, dépôt_le_plus_récent}) => [email, dépôt_le_plus_récent])
    )


    return dateDernièreUtilisationParInstructrice;

    // date de dernière phase
}