/** @import { default as Notification } from "../../types/database/public/Notification.ts" */
/** @import { default as Personne } from "../../types/database/public/Personne.ts" */


import knex from 'knex';
import { directDatabaseConnection } from '../database.js';

/**
 * Récupère les notifications d'une personne donnée
 * @param {string} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @return {Promise<Notification[]>}
 */
export async function getNotificationsPourPersonneDepuisCap(cap, databaseConnection = directDatabaseConnection) {
    /** @type {Pick<Personne, "id">} */
    const personne = await directDatabaseConnection('cap_évènement_métrique')
        .select('id')
        .from('personne')
        .join('cap_évènement_métrique', {'cap_évènement_métrique.personne_cap': 'personne.code_accès'})
        .where({'cap_évènement_métrique.cap': cap})
        .first()

    if (!personne) {
        throw new Error('Pas de personne avec cette capability')
    }

    return databaseConnection('notification')
        .select('*')
        .where('personne', personne.id)
}