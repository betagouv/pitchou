import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { store } from "$lib/state/store.svelte.ts";
import DossierNotificationBadges from "./DossierNotificationBadges.svelte";
import DossierNotificationReadTracker from "./DossierNotificationReadTracker.svelte";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierNotification, NotificationUpdate } from "@pitchou/types/notification.ts";

const dossier = 123 as DossierId;
const date = new Date("2026-09-01T12:00:00Z");
const initial = (): DossierNotification => ({
  dossier,
  viewed: false,
  updated_at: date,
  viewed_at: null,
  new_arrival: { detected_at: date },
  new_follow: { revision: "follow-1", detected_at: date },
  changes: [
    {
      field: "Description",
      label: "Description",
      revisions: [],
      detected_at: date,
      modified_at: null,
    },
  ],
});
let update: ReturnType<typeof vi.fn<(request: NotificationUpdate) => Promise<DossierNotification>>>;

beforeEach(() => {
  vi.useFakeTimers();
  store.notificationByDossier.clear();
  store.notificationByDossier.set(dossier, initial());
  update = vi.fn(async (request: NotificationUpdate) => {
    const serverState = store.notificationByDossier.get(request.dossier)!;
    return {
      ...serverState,
      dossier: request.dossier,
      new_arrival: request.arrival ? null : serverState.new_arrival,
      new_follow: request.followRevision ? null : serverState.new_follow,
    };
  });
  store.capabilities = { updateNotificationForDossier: update };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  store.capabilities = {};
  store.notificationByDossier.clear();
});

test("arrival takes priority over follow and modification tags without consuming them", async () => {
  const view = render(DossierNotificationBadges, { dossierId: dossier });
  expect(view.container.textContent).toContain("Nouveau dossier");
  expect(view.container.textContent).not.toContain("Nouveau suivi");
  expect(store.notificationByDossier.get(dossier)?.new_follow).not.toBeNull();
  expect(view.container.textContent).not.toContain("Modifié");
  store.notificationByDossier.set(dossier, { ...initial(), new_arrival: null });
  await tick();
  expect(view.container.textContent).toContain("Nouveau suivi");
  expect(view.container.textContent).toContain("Modifié");
  expect(view.container.textContent).not.toMatch(/détecté/i);
  expect(view.container.querySelector(".fr-icon-flashlight-fill")).toBeNull();
});

test("a retained sorting timestamp without pending revisions does not render a modified badge", () => {
  store.notificationByDossier.set(dossier, {
    ...initial(),
    viewed: true,
    new_arrival: null,
    new_follow: null,
    changes: [],
  });
  const view = render(DossierNotificationBadges, { dossierId: dossier });
  expect(view.container.textContent?.trim()).toBe("");
});

test("modification ages use calendar days, even beyond a month", async () => {
  vi.setSystemTime(new Date("2026-10-06T12:00:00Z"));
  const state = initial();
  store.notificationByDossier.set(dossier, { ...state, new_arrival: null, new_follow: null });
  const view = render(DossierNotificationBadges, { dossierId: dossier });
  expect(view.container.querySelector(".notification-badge")?.textContent).toBe(
    "Modifié il y a 35j",
  );
  expect(view.container.querySelector(".notification-badge")?.getAttribute("title")).toBe(
    "Modifié le 01/09/2026",
  );
  store.notificationByDossier.set(dossier, {
    ...state,
    new_arrival: null,
    new_follow: null,
    changes: [{ ...state.changes[0], modified_at: new Date("2026-10-06T08:00:00Z") }],
  });
  await tick();
  expect(view.container.querySelector(".notification-badge")?.textContent).toBe(
    "Modifié aujourd'hui",
  );
  expect(view.container.querySelector(".notification-badge")?.getAttribute("title")).toBe(
    "Modifié le 06/10/2026",
  );
  store.notificationByDossier.set(dossier, {
    ...state,
    new_arrival: null,
    new_follow: null,
    changes: [{ ...state.changes[0], detected_at: new Date(), modified_at: null }],
  });
  await tick();
  expect(view.container.textContent?.replace(/\s+/g, " ")).toContain("Modifié aujourd'hui");
});

test("five seconds acknowledge arrival and the exact follow, never fields", async () => {
  render(DossierNotificationReadTracker, { dossierId: dossier, readOnly: false });
  await tick();
  await vi.advanceTimersByTimeAsync(4999);
  expect(update).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(update).toHaveBeenCalledTimes(2);
  expect(update).toHaveBeenCalledWith({ dossier, arrival: true });
  expect(update).toHaveBeenCalledWith({ dossier, followRevision: "follow-1" });
  expect(store.notificationByDossier.get(dossier)?.changes).toHaveLength(1);
  expect(store.notificationByDossier.get(dossier)?.viewed).toBe(false);
});

test("unmount and read-only mode cancel the timer", async () => {
  const view = render(DossierNotificationReadTracker, { dossierId: dossier, readOnly: false });
  await tick();
  await vi.advanceTimersByTimeAsync(3000);
  view.unmount();
  await vi.advanceTimersByTimeAsync(5000);
  expect(update).not.toHaveBeenCalled();
  render(DossierNotificationReadTracker, { dossierId: dossier, readOnly: true });
  await tick();
  await vi.advanceTimersByTimeAsync(5000);
  expect(update).not.toHaveBeenCalled();
});

test("navigating to another dossier starts its own five seconds", async () => {
  const other = 456 as DossierId;
  store.notificationByDossier.set(other, { ...initial(), new_follow: null });
  const view = render(DossierNotificationReadTracker, { dossierId: dossier, readOnly: false });
  await tick();
  await vi.advanceTimersByTimeAsync(3000);
  await view.rerender({ dossierId: other, readOnly: false });
  await vi.advanceTimersByTimeAsync(2000);
  expect(update).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(3000);
  expect(update).toHaveBeenCalledExactlyOnceWith({ dossier: other, arrival: true });
});

test("a refollow restarts its dismissal without cancelling the arrival timer", async () => {
  render(DossierNotificationReadTracker, { dossierId: dossier, readOnly: false });
  await tick();
  await vi.advanceTimersByTimeAsync(3000);
  store.notificationByDossier.set(dossier, {
    ...initial(),
    new_follow: { revision: "follow-2", detected_at: date },
  });
  await tick();
  await vi.advanceTimersByTimeAsync(2000);
  expect(update).toHaveBeenCalledExactlyOnceWith({ dossier, arrival: true });
  await vi.advanceTimersByTimeAsync(3000);
  expect(update).toHaveBeenCalledWith({ dossier, followRevision: "follow-2" });
});
