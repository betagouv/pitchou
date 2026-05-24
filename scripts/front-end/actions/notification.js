/** @import { default as Notification } from "../../types/database/public/Notification"; */

import { store } from "../store.svelte.ts";

/**
 * @param { Pick<Notification, "dossier"> & Partial<Omit<Notification, 'dossier'>> } notification
 */
export function updateNotificationForDossier(notification) {
  const updateNotificationForDossier = store.capabilities.updateNotificationForDossier;

  if (!updateNotificationForDossier) {
    throw new Error(
      `Pas les droits suffisants pour mettre à jour la notification pour le dossier ${notification.dossier}. La notification : ${notification}.`,
    );
  }

  updateNotificationForDossier(notification).catch((e) =>
    console.warn(`Échec lors de la mise à jour de la notification :`, e, notification),
  );
}
