import knex from 'knex';

import {directDatabaseConnection} from '../database.js'

/** @import {default as Dossier} from '../../types/database/public/Dossier.ts' */
//@ts-ignore
/** @import {default as Message} from '../../types/database/public/Message.ts' */
//@ts-ignore
/** @import * as API_DS from '../../types/démarches-simplifiées/api.js' */


/**
 * 
 * @param {Dossier['id_demarches_simplifiées'][]} DS_ids 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Pick<Dossier, 'id' | 'id_demarches_simplifiées' | 'number_demarches_simplifiées'>[]>}
 */
export function getDossierIdsFromDS_Ids(DS_ids, databaseConnection = directDatabaseConnection){
    return databaseConnection('dossier')
        .select(['id', 'id_demarches_simplifiées', 'number_demarches_simplifiées'])
        .whereIn('id_demarches_simplifiées', DS_ids)
}


/**
 * @param {Map<Dossier['id'], API_DS.Message[]>} idToMessages
 * @param {import('knex').Knex.Transaction | import('knex').Knex} [databaseConnection]
 * @returns {Promise<any>}
 */
export async function dumpDossierMessages(idToMessages, databaseConnection = directDatabaseConnection) {
    /** @type {Partial<Message>[]} */
    const messages = [];
    
    for(const [dossierId, apiMessages] of idToMessages){
        for(const {id, body, createdAt, email} of apiMessages){
            messages.push({
                contenu: body,
                date: new Date(createdAt),
                email_expéditeur: email,
                id_démarches_simplifiées: id,
                dossier: dossierId
            })
        }
    };
    
    return databaseConnection('message')
        .insert(messages)
        .onConflict('id_démarches_simplifiées').merge()
}


/**
 * 
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @returns {Promise<Map<Dossier['id'], Message[]>>}
 */
export async function getAllMessages(databaseConnection = directDatabaseConnection){
    /** @type {Awaited<ReturnType<getAllMessages>>} */
    const map = new Map()

    const messages = await databaseConnection('message')
        .select('*')

    for(const message of messages){
        const dossierId = message.dossier

        const mess = map.get(dossierId) || []
        mess.push(message)
        map.set(dossierId, mess)
    }

    return map
}

throw `
    - côté client, n'aller chercher la conversation que quand on en a besoin
    - créer un endpoint correpondant pour l'id du dossier
    - Afficher la conversation
`