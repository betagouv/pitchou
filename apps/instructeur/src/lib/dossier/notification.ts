import { store } from "$lib/state/store.svelte.ts";
import type { DossierNotification, NotificationUpdate } from "@pitchou/types/notification.ts";

export function formatNotification(notification: DossierNotification): DossierNotification {
  return {
    ...notification,
    updated_at: notification.updated_at ? new Date(notification.updated_at) : null,
    viewed_at: notification.viewed_at ? new Date(notification.viewed_at) : null,
    new_arrival: notification.new_arrival
      ? { detected_at: new Date(notification.new_arrival.detected_at) }
      : null,
    new_follow: notification.new_follow
      ? { ...notification.new_follow, detected_at: new Date(notification.new_follow.detected_at) }
      : null,
    changes: notification.changes.map((change) => ({
      ...change,
      detected_at: new Date(change.detected_at),
      modified_at: change.modified_at ? new Date(change.modified_at) : null,
    })),
  };
}

let pending: Promise<unknown> = Promise.resolve();
let queueOwner: typeof store.capabilities | undefined;

export function enqueueNotificationRequest<T>(run: () => Promise<T>): Promise<T | undefined> {
  const capabilities = store.capabilities;
  if (queueOwner !== capabilities) {
    queueOwner = capabilities;
    pending = Promise.resolve();
  }
  const request = pending
    .catch(() => {})
    .then(() => {
      if (capabilities === store.capabilities) return run();
    });
  pending = request;
  return request;
}

async function publishNotification(notification: DossierNotification): Promise<void> {
  const capabilities = store.capabilities;
  const cached = store.fullDossiers.get(notification.dossier);
  const known = new Set(
    cached?.notificationSnapshot?.changes.flatMap(({ revisions }) => revisions),
  );
  if (
    cached &&
    notification.changes.some(({ revisions }) => revisions.some((id) => !known.has(id)))
  ) {
    try {
      // Already holding the session queue: do not enqueue a nested refresh.
      const { fetchDossierFullSnapshot } = await import("./dossier.ts");
      const fresh = await fetchDossierFullSnapshot(notification.dossier);
      if (
        fresh.notificationSnapshot &&
        fresh.notificationSnapshot !== cached.notificationSnapshot &&
        fresh === store.fullDossiers.get(notification.dossier)
      )
        return;
      if (fresh.access === "lecture") return;
    } catch {
      if (capabilities === store.capabilities)
        store.errors.add({
          message:
            "Impossible d'actualiser les valeurs du dossier. Actualisez les modifications avant de les valider.",
        });
    }
  }
  if (capabilities === store.capabilities)
    store.notificationByDossier.set(notification.dossier, formatNotification(notification));
}

export async function refreshNotifications() {
  const capability = store.capabilities.listerNotifications;
  if (!capability) return;
  return enqueueNotificationRequest(async () => {
    const notifications = await capability();
    if (capability !== store.capabilities.listerNotifications) return;
    const accessible = new Set(notifications.map(({ dossier }) => dossier));
    for (const id of store.notificationByDossier.keys())
      if (!accessible.has(id)) store.notificationByDossier.delete(id);
    for (const notification of notifications) {
      if (capability !== store.capabilities.listerNotifications) return;
      await publishNotification(notification);
    }
  });
}

export function updateNotificationForDossier(update: NotificationUpdate) {
  const capability = store.capabilities.updateNotificationForDossier;
  if (!capability) return Promise.reject(new Error("Validation non autorisée"));
  return enqueueNotificationRequest(async () => {
    if (capability !== store.capabilities.updateNotificationForDossier) return;
    const notification = await capability(update);
    if (capability === store.capabilities.updateNotificationForDossier) {
      await publishNotification(notification);
    }
  });
}
