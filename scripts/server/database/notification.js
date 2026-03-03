/** @import { default as Notification, NotificationInitializer } from "../../types/database/public/Notification.ts" */
/** @import { default as CapDossier } from '../../types/database/public/CapDossier.ts' */

import knex from 'knex';
import { directDatabaseConnection } from '../database.js';
import { getPersonneByDossierCap } from './personne.js';
/**
 * Récupère les notifications d'une personne donnée
 * @param {CapDossier['cap']} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @return {Promise<Notification[]>}
 */
export async function getNotificationsPourPersonneDepuisCap(cap, databaseConnection = directDatabaseConnection) {
    const personne = await getPersonneByDossierCap(cap)

    if (!personne) {
        throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`)
    }

    return databaseConnection('notification')
        .select('*')
        .where('personne', personne.id)
}


/**
 * Met à jour la notification d'un dossier d'une personne à partir de sa capability.
 * @param { CapDossier['cap'] } cap
 * @param { NotificationInitializer } notification
 * @param { knex.Knex.Transaction | knex.Knex } [databaseConnection]
 */
export async function updateNotificationDossierFromCap(cap, notification, databaseConnection = directDatabaseConnection) {
    const personne = await getPersonneByDossierCap(cap)

    if (!personne) {
        throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`)
    }

    const notificationÀUpdate =  { vue: notification.vue}

    return await databaseConnection('notification')
        .update(notificationÀUpdate)
        .where({
        dossier: notification.dossier,
        personne: personne.id
        })
}