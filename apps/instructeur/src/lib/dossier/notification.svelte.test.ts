import { afterEach, expect, test, vi } from "vitest";
import { store } from "$lib/state/store.svelte.ts";
import { refreshNotifications, updateNotificationForDossier } from "./notification.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import { refreshDossierFull } from "./dossier.ts";
import { fakeDossierFull } from "../../routes/fakeDossier.ts";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

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
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
  store.errors.clear();
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
  await acknowledgment;
  expect(update).toHaveBeenCalledOnce();
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

test("an older list cannot remove an acknowledgment that completed after the list started", async () => {
  const response = Promise.withResolvers<DossierNotification[]>();
  store.notificationByDossier.set(first, state(first));
  store.capabilities = {
    listerNotifications: () => response.promise,
    updateNotificationForDossier: async () => ({
      ...state(first),
      viewed: true,
      new_arrival: null,
    }),
  };
  const refreshing = refreshNotifications();
  await updateNotificationForDossier({ dossier: first, arrival: true });
  response.resolve([]);
  await refreshing;
  expect(store.notificationByDossier.get(first)?.viewed).toBe(true);
});

test("a newer list request supersedes an older response", async () => {
  const response = Promise.withResolvers<DossierNotification[]>();
  store.capabilities = {
    listerNotifications: vi
      .fn()
      .mockReturnValueOnce(response.promise)
      .mockResolvedValue([state(other)]),
  };
  const old = refreshNotifications();
  await vi.waitFor(() => expect(store.capabilities.listerNotifications).toHaveBeenCalledOnce());
  await refreshNotifications();
  response.resolve([state(first)]);
  await old;
  expect([...store.notificationByDossier.keys()]).toEqual([other]);
});

test("a list started during an acknowledgment reads only after that write completes", async () => {
  const response = Promise.withResolvers<DossierNotification>();
  const read = { ...state(first), viewed: true, new_arrival: null };
  const list = vi.fn().mockResolvedValue([read]);
  store.capabilities = {
    listerNotifications: list,
    updateNotificationForDossier: () => response.promise,
  };
  const acknowledgment = updateNotificationForDossier({ dossier: first, arrival: true });
  const refreshing = refreshNotifications();
  await Promise.resolve();
  expect(list).not.toHaveBeenCalled();
  response.resolve(read);
  await Promise.all([acknowledgment, refreshing]);
  expect(list).toHaveBeenCalledOnce();
  expect(store.notificationByDossier.get(first)?.viewed).toBe(true);
});

test("an unrelated cached refresh does not block navigation or acknowledgments", async () => {
  const response = Promise.withResolvers<DossierFull>();
  const changed: DossierNotification = {
    ...state(first),
    changes: [
      {
        field: "Description",
        label: "Description",
        column: "description",
        revisions: ["revision" as ActionDossierId],
        detected_at: new Date(),
        modified_at: null,
      },
    ],
  };
  const fetched = vi.fn((id: DossierId) =>
    id === first
      ? response.promise
      : Promise.resolve(fakeDossierFull({ id, notificationSnapshot: state(id) })),
  );
  store.fullDossiers.set(first, fakeDossierFull({ id: first }));
  store.capabilities = {
    listerNotifications: async () => [changed],
    recupérerDossierComplet: fetched,
    updateNotificationForDossier: vi
      .fn()
      .mockResolvedValue({ ...state(other), viewed: true, new_arrival: null }),
  };
  const refreshing = refreshNotifications();
  await vi.waitFor(() => expect(fetched).toHaveBeenCalledWith(first, false));
  await refreshDossierFull(other);
  await updateNotificationForDossier({ dossier: other, arrival: true });
  expect(store.fullDossiers.has(other)).toBe(true);
  expect(store.notificationByDossier.get(other)?.viewed).toBe(true);
  expect(store.fullDossiers.get(first)?.notificationSnapshot).toBeUndefined();
  response.resolve(fakeDossierFull({ id: first, notificationSnapshot: changed }));
  await refreshing;
  expect(store.notificationByDossier.get(first)?.changes).toHaveLength(1);
});

test("navigation does not wait for a list request and its snapshot supersedes the old list", async () => {
  const response = Promise.withResolvers<DossierNotification[]>();
  const read = { ...state(first), viewed: true, new_arrival: null };
  store.capabilities = {
    listerNotifications: () => response.promise,
    recupérerDossierComplet: async () => fakeDossierFull({ id: first, notificationSnapshot: read }),
  };
  const refreshing = refreshNotifications();
  await refreshDossierFull(first);
  response.resolve([state(first), state(other)]);
  await refreshing;
  expect(store.notificationByDossier.get(first)?.viewed).toBe(true);
  expect(store.notificationByDossier.get(other)?.viewed).toBe(false);
});
