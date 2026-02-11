/** @import { PersonneId } from "../../types/database/public/Personne.ts" */
/** @import { default as Notification } from "../../types/database/public/Notification.ts" */

import knex from 'knex';
import { directDatabaseConnection } from '../database.js';

/**
 * Récupère les notifications d'une personne donnée
 * @param {PersonneId} personneId
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @return {Promise<Notification[]>}
 */
export async function getNotificationsPourPersonne(personneId, databaseConnection = directDatabaseConnection) {
    return databaseConnection('notification').select('*').where('personne', personneId)
}