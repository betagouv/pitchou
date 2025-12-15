/** @import {default as Personne} from '../../types/database/public/Personne.ts' */

import { max as mostRecent } from "date-fns";

import {directDatabaseConnection} from '../database.js'

/**
 * 
 * @returns {Promise<Map<NonNullable<Personne['email']>, Date>>}
 */
export async function getDateDernièreUtilisationParInstructrice(databaseConnection = directDatabaseConnection){

    const emailsEtDates = await databaseConnection('personne')
        .select(['email'])
        .max('horodatage as changement_de_phase_le_plus_récent')
        .max('date_dépôt as dépôt_le_plus_récent')
        .max('date_signature as date_signature_la_plus_récente')
        .max('date_saisine as date_saisine_la_plus_récente')
        .max('date_avis as date_avis_la_plus_récente')
        .join(
            'arête_personne_suit_dossier', 
            {'arête_personne_suit_dossier.personne': 'personne.id'}
        )
        .join(
            'dossier',
            {'dossier.id': 'arête_personne_suit_dossier.dossier'}
        )
        .join(
            'évènement_phase_dossier',
            {'évènement_phase_dossier.dossier': 'dossier.id'}
        )
        .leftJoin(
            'décision_administrative',
            {'décision_administrative.dossier': 'dossier.id'}
        )
        .leftJoin(
            'avis_expert',
            {'avis_expert.dossier': 'dossier.id'}
        )
        .groupBy('email')


    /** @type {Awaited<ReturnType<getDateDernièreUtilisationParInstructrice>>} */
    // @ts-ignore
    const dateDernièreUtilisationParInstructrice = new Map()

    for(const {
        email, 
        changement_de_phase_le_plus_récent, 
        dépôt_le_plus_récent, 
        date_signature_la_plus_récente, 
        date_saisine_la_plus_récente,
        date_avis_la_plus_récente
    } of emailsEtDates){
        const mostRecentActivityDate = mostRecent([
            changement_de_phase_le_plus_récent, 
            dépôt_le_plus_récent,
            date_signature_la_plus_récente,
            date_saisine_la_plus_récente,
            date_avis_la_plus_récente
        ])

        dateDernièreUtilisationParInstructrice.set(email, mostRecentActivityDate)
    }


    return dateDernièreUtilisationParInstructrice;

}