/** @import { default as Notification } from "../../types/database/public/Notification"; */

import store from "../store";

/**
 * @param { Pick<Notification, "dossier"> & Partial<Omit<Notification, 'dossier'>> } notification
 */
export function updateNotificationForDossier(notification) {
    if (store.state.capabilities.updateNotificationForDossier) {
        store.state.capabilities.updateNotificationForDossier(notification)
            .catch(e => console.warn(`Échec lors de la mise à jour de la notification :`, e, notification))
    }
}