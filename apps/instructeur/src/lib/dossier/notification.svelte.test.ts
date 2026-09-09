import { afterEach, expect, test, vi } from "vitest";
import { store } from "$lib/state/store.svelte.ts";
import { refreshNotifications, updateNotificationForDossier } from "./notification.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const first = 1 as DossierId;
const other = 2 as DossierId;
const state = (dossier: DossierId): DossierNotification => ({
  dossier,
  viewed: false,
  updated_at: null,
  viewed_at: null,
  new_arrival: { detected_at: new Date() },
  new_follow: null,
  changes: [],
});
afterEach(() => {
  store.capabilities = {};
  store.notificationByDossier.clear();
});

test("an acknowledgment cannot discard a list refresh for other dossiers", async () => {
  let resolve!: (states: DossierNotification[]) => void;
  const list = vi.fn(
    () =>
      new Promise<DossierNotification[]>((done) => {
        resolve = done;
      }),
  );
  const update = vi.fn().mockResolvedValue({ ...state(first), viewed: true, new_arrival: null });
  store.capabilities = { listerNotifications: list, updateNotificationForDossier: update };
  const refresh = refreshNotifications();
  await vi.waitFor(() => expect(list).toHaveBeenCalledOnce());
  const acknowledgment = updateNotificationForDossier({ dossier: first, arrival: true });
  expect(update).not.toHaveBeenCalled();
  resolve([state(first), state(other)]);
  await Promise.all([refresh, acknowledgment]);
  expect(store.notificationByDossier.get(first)?.viewed).toBe(true);
  expect(store.notificationByDossier.get(other)?.new_arrival).not.toBeNull();
});

test("a new session is not blocked by an old request and ignores its late response", async () => {
  let resolve!: (states: DossierNotification[]) => void;
  const oldList = vi.fn(
    () =>
      new Promise<DossierNotification[]>((done) => {
        resolve = done;
      }),
  );
  store.capabilities = { listerNotifications: oldList };
  const oldRefresh = refreshNotifications();
  await vi.waitFor(() => expect(oldList).toHaveBeenCalledOnce());
  store.capabilities = { listerNotifications: vi.fn().mockResolvedValue([state(other)]) };
  await refreshNotifications();
  expect([...store.notificationByDossier.keys()]).toEqual([other]);
  resolve([state(first)]);
  await oldRefresh;
  expect([...store.notificationByDossier.keys()]).toEqual([other]);
});

test("a failed request does not prevent subsequent notification refreshes", async () => {
  store.capabilities = {
    updateNotificationForDossier: vi.fn().mockRejectedValue(new Error("offline")),
    listerNotifications: vi.fn().mockResolvedValue([state(other)]),
  };
  await expect(updateNotificationForDossier({ dossier: first, arrival: true })).rejects.toThrow(
    "offline",
  );
  await refreshNotifications();
  expect(store.notificationByDossier.has(other)).toBe(true);
});
