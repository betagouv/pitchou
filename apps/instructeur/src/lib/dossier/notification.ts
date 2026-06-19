import { store } from "$lib/state/store.svelte.ts";

import type { default as Notification } from "@pitchou/types/database/public/Notification.ts";

export function updateNotificationForDossier(
  notification: Pick<Notification, "dossier"> & Partial<Omit<Notification, "dossier">>,
) {
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
