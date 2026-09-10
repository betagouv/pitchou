import { store } from "$lib/state/store.svelte.ts";
import type { DossierNotification, NotificationUpdate } from "@pitchou/types/notification.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

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

let session = {
  capabilities: store.capabilities,
  pending: new Map<DossierId, Promise<unknown>>(),
  versions: new Map<DossierId, number>(),
  listVersion: 0,
};

function notificationSession() {
  if (session.capabilities !== store.capabilities) {
    session = {
      capabilities: store.capabilities,
      pending: new Map(),
      versions: new Map(),
      listVersion: 0,
    };
  }
  return session;
}

export function enqueueNotificationRequest<T>(
  dossier: DossierId,
  run: () => Promise<T>,
): Promise<T | undefined> {
  const session = notificationSession();
  session.versions.set(dossier, (session.versions.get(dossier) ?? 0) + 1);
  const request = (session.pending.get(dossier) ?? Promise.resolve())
    .catch(() => {})
    .then(() => {
      if (session.capabilities === store.capabilities) return run();
    });
  session.pending.set(dossier, request);
  const clear = () => {
    if (session.pending.get(dossier) === request) session.pending.delete(dossier);
  };
  void request.then(clear, clear);
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
      // Already holding this dossier's queue: do not enqueue a nested refresh.
      const { fetchDossierFullSnapshot } = await import("./dossier.ts");
      if (capabilities !== store.capabilities) return;
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
  const session = notificationSession();
  const listVersion = ++session.listVersion;
  const versions = new Map(session.versions);
  // Read after requests already in flight, especially acknowledgments whose
  // writes have not committed. This wait belongs to the list, not to navigation.
  await Promise.allSettled([...session.pending.values()]);
  if (session.capabilities !== store.capabilities || listVersion !== session.listVersion) return;
  const notifications = await capability();
  if (session.capabilities !== store.capabilities || listVersion !== session.listVersion) return;

  // A list response must not undo a detail fetch or acknowledgment requested later.
  const unchanged = (dossier: DossierId) => session.versions.get(dossier) === versions.get(dossier);
  const accessible = new Set(notifications.map(({ dossier }) => dossier));
  const removed = [...store.notificationByDossier.keys()].filter(
    (dossier) => !accessible.has(dossier) && unchanged(dossier),
  );
  await Promise.all([
    ...removed.map((dossier) =>
      enqueueNotificationRequest(dossier, async () => {
        store.notificationByDossier.delete(dossier);
      }),
    ),
    ...notifications
      .filter(({ dossier }) => unchanged(dossier))
      .map((notification) =>
        enqueueNotificationRequest(notification.dossier, () => publishNotification(notification)),
      ),
  ]);
}

export function updateNotificationForDossier(update: NotificationUpdate) {
  const capability = store.capabilities.updateNotificationForDossier;
  if (!capability) return Promise.reject(new Error("Validation non autorisée"));
  return enqueueNotificationRequest(update.dossier, async () => {
    if (capability !== store.capabilities.updateNotificationForDossier) return;
    const notification = await capability(update);
    if (capability === store.capabilities.updateNotificationForDossier) {
      await publishNotification(notification);
    }
  });
}
