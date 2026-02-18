/** @import { default as Notification, NotificationInitializer } from "../../types/database/public/Notification.ts" */
/** @import { default as Personne } from "../../types/database/public/Personne.ts" */


import knex from 'knex';
import { directDatabaseConnection } from '../database.js';


/**
 * 
 * @param {string} cap 
 * @returns {Promise<Personne>}
 */
async function getPersonneFromCap(cap) {
    /** @type {Personne} */
    const personne = await directDatabaseConnection('cap_évènement_métrique')
        .select('*')
        .from('personne')
        .join('cap_évènement_métrique', {'cap_évènement_métrique.personne_cap': 'personne.code_accès'})
        .where({'cap_évènement_métrique.cap': cap})
        .first()

    if (!personne) {
        throw new Error(`Aucune personne n'a été trouvée pour la capability : ${cap}`)
    }
    return personne
}

/**
 * Récupère les notifications d'une personne donnée
 * @param {string} cap
 * @param {knex.Knex.Transaction | knex.Knex} [databaseConnection]
 * @return {Promise<Notification[]>}
 */
export async function getNotificationsPourPersonneDepuisCap(cap, databaseConnection = directDatabaseConnection) {
    const personne = await getPersonneFromCap(cap)

    return databaseConnection('notification')
        .select('*')
        .where('personne', personne.id)
}


/**
 * Met à jour la notification d'un dossier d'une personne à partir de sa capability.
 * @param { string } cap
 * @param { NotificationInitializer } notification
 * @param { knex.Knex.Transaction | knex.Knex } [databaseConnection]
 */
export async function updateNotificationDossierFromCap(cap, notification, databaseConnection = directDatabaseConnection) {
    const personne = await getPersonneFromCap(cap)

    const notificationÀUpdate =  { vue: notification.vue}

    console.log('notification', notificationÀUpdate)

    return await databaseConnection('notification')
        .update(notificationÀUpdate)
        .where('dossier', '=', notification.dossier)
        .andWhere('personne', '=', personne.id)
}