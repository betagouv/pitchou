import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { store } from "$lib/state/store.svelte.ts";
import { refreshDossierFull } from "../dossier.ts";
import { refreshNotifications, updateNotificationForDossier } from "../notification.ts";
import { boundReviewChanges, registerReviewSnapshot } from "./snapshot.ts";
import CachedDetailFixture from "./CachedDetailFixture.svelte";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierNotification, NotificationUpdate } from "@pitchou/types/notification.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

vi.mock("$env/dynamic/public", () => ({ env: {} }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
const id = 123 as DossierFull["id"];
const notice = (ids: string[]): DossierNotification => ({
  dossier: id,
  viewed: !ids.length,
  updated_at: new Date(),
  viewed_at: null,
  new_arrival: null,
  new_follow: null,
  changes: ids.length
    ? [
        {
          field: "Description",
          column: "description",
          label: "Description",
          revisions: ids as ActionDossierId[],
          detected_at: new Date(),
          modified_at: null,
        },
      ]
    : [],
});
const body = (description: string, ids: string[]): DossierFull =>
  ({
    id,
    name: "Projet",
    source: "demarche_numerique",
    access: "complet",
    description,
    especesImpactees: { impacts: [] },
    piecesJointesPetitionnaires: [],
    evenementsPhase: [],
    avisExpert: [],
    depot_date: new Date(),
    notificationSnapshot: notice(ids),
  }) as unknown as DossierFull;
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.fullDossiers.clear();
  store.notificationByDossier.clear();
  store.errors.clear();
});

test("a timer response cannot put a new revision's check beside the old cached description", async () => {
  let resolve!: (dossier: DossierFull) => void;
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(body("Ancienne description", ["r1"]))
    .mockImplementationOnce(
      () =>
        new Promise<DossierFull>((done) => {
          resolve = done;
        }),
    );
  const update = vi.fn(async (request: NotificationUpdate) =>
    request.arrival
      ? notice(["r1", "r2"])
      : request.revisions?.includes("r2" as ActionDossierId)
        ? notice([])
        : notice(["r2"]),
  );
  store.capabilities = { recupérerDossierComplet: fetch, updateNotificationForDossier: update };
  await refreshDossierFull(id);
  const view = render(CachedDetailFixture, { dossierId: id });
  [...view.container.querySelectorAll<HTMLButtonElement>("h3 button")]
    .find((button) => button.textContent?.includes("Informations du projet"))!
    .click();
  await tick();
  const timer = updateNotificationForDossier({ dossier: id, arrival: true });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(view.container.textContent).toContain("Ancienne description");
  expect(
    boundReviewChanges(store.fullDossiers.get(id)!, store.notificationByDossier.get(id))[0]
      .revisions,
  ).toEqual(["r1"]);
  view.container
    .querySelector<HTMLButtonElement>('button[aria-label="Valider la modification : Description"]')!
    .click();
  resolve(body("Nouvelle description", ["r1", "r2"]));
  await timer;
  await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ dossier: id, revisions: ["r1"] }));
  await tick();
  expect(update).not.toHaveBeenCalledWith({ dossier: id, revisions: ["r2"] });
  expect(view.container.textContent).toContain("Nouvelle description");
  expect(view.container.textContent).not.toContain("Ancienne description");
  await vi.waitFor(() => {
    expect(store.notificationByDossier.get(id)?.changes[0].revisions).toEqual(["r2"]);
    expect(
      view.container.querySelector<HTMLButtonElement>(
        'button[aria-label="Valider la modification : Description"]',
      )!.disabled,
    ).toBe(false);
  });
  view.container
    .querySelector<HTMLButtonElement>('button[aria-label="Valider la modification : Description"]')!
    .click();
  await vi.waitFor(() => expect(update).toHaveBeenCalledWith({ dossier: id, revisions: ["r2"] }));
});

test("failed refresh exposes unread metadata but never makes unseen revisions reviewable", async () => {
  store.capabilities = {
    recupérerDossierComplet: vi
      .fn()
      .mockResolvedValueOnce(body("Ancien texte", ["r1"]))
      .mockRejectedValue(new Error("offline")),
    updateNotificationForDossier: vi.fn().mockResolvedValue(notice(["r2"])),
  };
  await refreshDossierFull(id);
  await updateNotificationForDossier({ dossier: id, arrival: true });
  expect(store.notificationByDossier.get(id)?.viewed).toBe(false);
  expect(
    boundReviewChanges(store.fullDossiers.get(id)!, store.notificationByDossier.get(id)),
  ).toEqual([]);
  const view = render(CachedDetailFixture, { dossierId: id });
  expect(view.container.querySelector('[aria-label^="Valider la modification"]')).toBeNull();
  expect(view.container.textContent).toContain("Actualiser les modifications");
});

test("initial navigation and later notification requests cannot complete in the wrong cache order", async () => {
  let resolve!: (dossier: DossierFull) => void;
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<DossierFull>((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce(body("Nouveau", ["r2"]));
  store.capabilities = { recupérerDossierComplet: fetch };
  const first = refreshDossierFull(id);
  const second = refreshDossierFull(id);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  resolve(body("Ancien", ["r1"]));
  await Promise.all([first, second]);
  expect(store.fullDossiers.get(id)?.description).toBe("Nouveau");
  expect(
    boundReviewChanges(store.fullDossiers.get(id)!, store.notificationByDossier.get(id))[0]
      .revisions,
  ).toEqual(["r2"]);
});

test("full values, not excerpts, bind reviews; unrelated instruction changes keep the binding", () => {
  const dossier = body("x".repeat(200) + " ancien", ["r1"]);
  registerReviewSnapshot(dossier);
  expect(
    boundReviewChanges({ ...dossier, description: "x".repeat(200) + " nouveau" }, notice(["r1"])),
  ).toEqual([]);
  expect(boundReviewChanges({ ...dossier, enjeu: true }, notice(["r1"]))[0].revisions).toEqual([
    "r1",
  ]);
  expect(boundReviewChanges(dossier, notice(["r2"]))).toEqual([]);
  expect(boundReviewChanges({ ...dossier, id: 456 as DossierFull["id"] }, notice(["r1"]))).toEqual(
    [],
  );
});

test("an independent initial list load publishes new IDs only after the corresponding detail values", async () => {
  let resolve!: (dossier: DossierFull) => void;
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<DossierFull>((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce(body("Nouveau", ["r1", "r2"]));
  const list = vi.fn().mockResolvedValue([notice(["r1", "r2"])]);
  store.capabilities = { recupérerDossierComplet: fetch, listerNotifications: list };
  const detail = refreshDossierFull(id);
  const notifications = refreshNotifications();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(list).not.toHaveBeenCalled();
  resolve(body("Ancien", ["r1"]));
  await Promise.all([detail, notifications]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(store.fullDossiers.get(id)?.description).toBe("Nouveau");
  expect(
    boundReviewChanges(store.fullDossiers.get(id)!, store.notificationByDossier.get(id))[0]
      .revisions,
  ).toEqual(["r1", "r2"]);
});
