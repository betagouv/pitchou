import {directDatabaseConnection} from '../database.js'
import {getPersonneByEmail} from './personne.js';

/** @import {Knex} from 'knex' */
/** @import CapDossier from '../../types/database/public/CapDossier.ts' */
/** @import Dossier from '../../types/database/public/Dossier.ts' */
/** @import Personne from '../../types/database/public/Personne.ts' */

//@ts-expect-error solution temporaire pour https://github.com/microsoft/TypeScript/issues/60908
const inutile = true;


/**
 * 
 * @param {CapDossier['cap']} cap 
 * @param {NonNullable<Personne['email']>} personneEmail 
 * @param {Dossier['id']} dossierId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @return {Promise<any[]>}
 */
export function trouverRelationPersonneDepuisCap(cap, personneEmail, dossierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('cap_dossier')
        .select(['dossier.id as dossier_id', 'personne.id as personne_id'])
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
            'dossier.id': dossierId
        })
}


/**
 * 
 * @param {Personne['id']} personneid 
 * @param {Dossier['id']} dossierId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @return {Promise<void>}
 */
export async function instructeurSuitDossier(personneid, dossierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('arête_personne_suit_dossier')
        .insert({
            personne: personneid,
            dossier: dossierId
        })
        .onConflict(['personne', 'dossier'])
        .ignore() // ignorer si la personne suit déjà le dossier, parce que c'est le résultat final qui compte
        .then(() => undefined)
}


/**
 * 
 * @param {Personne['id']} personneid 
 * @param {Dossier['id']} dossierId 
 * @param {Knex.Transaction | Knex} [databaseConnection]
 * @return {Promise<void>}
 */
export async function instructeurLaisseDossier(personneid, dossierId, databaseConnection = directDatabaseConnection){
    return databaseConnection('arête_personne_suit_dossier')
        .delete()
        .where({
            personne: personneid,
            dossier: dossierId
        })
        .then(() => undefined)
}