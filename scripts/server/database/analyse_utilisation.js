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
export function getDateDernièreUtilisationParInstructrice(){

    throw 'recups la Map<email, date de dépôt>'

    // date de dépôt
    const yo = databaseConnection('cap_dossier')
        .select(['arête_groupe_instructeurs__dossier.dossier as dossier_id', 'personne.id as personne_id'])
        .leftJoin(
            'arête_cap_dossier__groupe_instructeurs',
            {'arête_cap_dossier__groupe_instructeurs.cap_dossier': 'cap_dossier.cap'}
        )
        .leftJoin(
            'arête_groupe_instructeurs__dossier', 
            {'arête_groupe_instructeurs__dossier.groupe_instructeurs': 'arête_cap_dossier__groupe_instructeurs.groupe_instructeurs'}
        )
        .leftJoin(
            'personne', 
            {'personne.code_accès': 'cap_dossier.personne_cap'}
        )
        .where({
            'cap_dossier.cap': cap,
            'personne.email': personneEmail, 
            'arête_groupe_instructeurs__dossier.dossier': dossierId
        }) 
    // date de dernière phase
}