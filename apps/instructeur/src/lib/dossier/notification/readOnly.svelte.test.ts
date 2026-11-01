import { afterEach, expect, test, vi } from "vitest";
import { store } from "#lib/state/store.svelte.ts";
import { fakeDossierFull } from "../../../routes/fakeDossier.ts";
import { getDossierFull, refreshDossierFull } from "../dossier.ts";
import { refreshNotifications, updateNotificationForDossier } from "../notification.ts";
import { boundReviewChanges } from "./snapshot.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierNotification } from "@pitchou/types/notification.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

vi.mock("$app/env/public", () => ({ PUBLIC_PITCHOU_ENV: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

const id = 123 as DossierFull["id"];
function notice(revisions: string[]): DossierNotification {
  return {
    dossier: id,
    viewed: revisions.length === 0,
    updated_at: new Date(),
    viewed_at: null,
    new_arrival: null,
    new_follow: null,
    changes:
      revisions.length > 0
        ? [
            {
              field: "Description",
              column: "description",
              label: "Description",
              revisions: revisions as ActionDossierId[],
              detected_at: new Date(),
              modified_at: null,
            },
          ]
        : [],
  };
}
function body(access: DossierFull["access"], description: string, revisions: string[]) {
  return fakeDossierFull({ id, access, description, notificationSnapshot: notice(revisions) });
}

afterEach(() => {
  store.capabilities = {};
  store.fullDossiers.clear();
  store.readOnlyDossiers.clear();
  store.dossierSummaries.clear();
  store.notificationByDossier.clear();
  store.errors.clear();
});

test.each(["lecture", "lecture_complete"] as const)(
  "%s detail snapshots remain reviewable after personal arrival acknowledgment",
  async (access) => {
    const fetch = vi.fn().mockResolvedValue(body(access, "Description visible", ["r1"]));
    const update = vi.fn().mockResolvedValue(notice(["r1"]));
    store.capabilities = { recupérerDossierComplet: fetch, updateNotificationForDossier: update };
    await refreshDossierFull(id);
    await updateNotificationForDossier({ dossier: id, arrival: true });
    const cached = (access === "lecture" ? store.readOnlyDossiers : store.fullDossiers).get(id)!;
    expect(boundReviewChanges(cached, store.notificationByDossier.get(id))[0].revisions).toEqual([
      "r1",
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    await updateNotificationForDossier({ dossier: id, revisions: ["r1" as ActionDossierId] });
    expect(update).toHaveBeenLastCalledWith({ dossier: id, revisions: ["r1"] });
    if (access === "lecture") expect(store.fullDossiers.has(id)).toBe(false);
  },
);

test("a restricted follower refreshes values atomically when a notification discovers a new revision", async () => {
  const response = Promise.withResolvers<DossierFull>();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(body("lecture", "Ancienne description", ["r1"]))
    .mockReturnValueOnce(response.promise);
  store.capabilities = {
    recupérerDossierComplet: fetch,
    listerNotifications: vi.fn().mockResolvedValue([notice(["r1", "r2"])]),
  };
  await refreshDossierFull(id);
  const refreshing = refreshNotifications();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const previous = store.readOnlyDossiers.get(id)!;
  expect(previous.description).toBe("Ancienne description");
  expect(boundReviewChanges(previous, store.notificationByDossier.get(id))[0].revisions).toEqual([
    "r1",
  ]);
  response.resolve(body("lecture", "Nouvelle description", ["r1", "r2"]));
  await refreshing;
  const current = store.readOnlyDossiers.get(id)!;
  expect(current.description).toBe("Nouvelle description");
  expect(boundReviewChanges(current, store.notificationByDossier.get(id))[0].revisions).toEqual([
    "r1",
    "r2",
  ]);
  expect(store.fullDossiers.has(id)).toBe(false);
});

test("a failed restricted refresh cannot bind new revisions to the previously displayed values", async () => {
  store.capabilities = {
    recupérerDossierComplet: vi
      .fn()
      .mockResolvedValueOnce(body("lecture", "Ancienne description", ["r1"]))
      .mockRejectedValue(new Error("offline")),
    updateNotificationForDossier: vi.fn().mockResolvedValue(notice(["r2"])),
  };
  await refreshDossierFull(id);
  await updateNotificationForDossier({ dossier: id, arrival: true });
  expect(store.notificationByDossier.get(id)?.changes[0].revisions).toEqual(["r2"]);
  expect(
    boundReviewChanges(store.readOnlyDossiers.get(id)!, store.notificationByDossier.get(id)),
  ).toEqual([]);
  expect(store.fullDossiers.has(id)).toBe(false);
});

test.each(["complet", "lecture_complete"] as const)(
  "%s preview never replaces or inherits the real personal review snapshot",
  async (access) => {
    const full = body(access, "Description visible", ["r1"]);
    const preview = { ...full, notificationSnapshot: undefined };
    const fetch = vi.fn(async (_id: DossierFull["id"], readOnly = false) =>
      readOnly ? preview : full,
    );
    store.capabilities = { recupérerDossierComplet: fetch };
    await refreshDossierFull(id);
    await refreshDossierFull(id, { readOnly: true });
    expect(store.fullDossiers.get(id)).toBe(full);
    expect(store.readOnlyDossiers.get(id)).toBe(preview);
    expect(boundReviewChanges(preview, store.notificationByDossier.get(id))).toEqual([]);
    expect(boundReviewChanges(full, store.notificationByDossier.get(id))[0].revisions).toEqual([
      "r1",
    ]);
    expect(await getDossierFull(id)).toBe(full);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(fetch).toHaveBeenLastCalledWith(id, false);
  },
);
