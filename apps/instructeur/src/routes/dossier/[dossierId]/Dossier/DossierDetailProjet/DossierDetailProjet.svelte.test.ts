import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import DossierNotificationBadges from "$lib/components/DossierNotificationBadges.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { registerReviewSnapshot } from "$lib/dossier/notification/snapshot.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierNotification, FieldChange } from "@pitchou/types/notification.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";

const mode = vi.hoisted(() => ({ current: false }));
vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => mode }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));

const dossier = {
  id: 123,
  name: "Projet",
  source: "pitchou",
  description: null,
  especesImpactees: { impacts: [], sourceFile: undefined },
  piecesJointesPetitionnaires: [],
} as unknown as DossierFull;
const change: FieldChange = {
  field: "Description",
  column: "description",
  label: "Description",
  revisions: ["revision-1" as ActionDossierId],
  detected_at: new Date("2026-09-01"),
  modified_at: null,
};
const notification = (): DossierNotification => ({
  dossier: dossier.id,
  viewed: false,
  updated_at: change.detected_at,
  viewed_at: null,
  changes: [change],
  new_arrival: null,
  new_follow: null,
});

beforeEach(() => {
  mode.current = false;
  store.notificationByDossier.set(dossier.id, notification());
  dossier.notificationSnapshot = notification();
  registerReviewSnapshot(dossier);
  store.capabilities = {
    updateNotificationForDossier: vi
      .fn()
      .mockResolvedValue({ ...notification(), viewed: true, changes: [] }),
  };
});
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.notificationByDossier.clear();
});

test("acknowledgment removes the field, accordion and top badges; a new revision reopens them", async () => {
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  const top = render(DossierNotificationBadges, { dossierId: dossier.id });
  const accordion = [...view.container.querySelectorAll<HTMLButtonElement>("h3 button")].find(
    (button) => button.textContent?.includes("Informations du projet"),
  )!;
  expect(accordion.textContent).toContain("Nouvelles modifications");
  expect(top.container.textContent).toContain("Modifié");
  accordion.click();
  await tick();
  view.container
    .querySelector<HTMLButtonElement>('button[aria-label="Valider la modification : Description"]')!
    .click();
  await vi.waitFor(() => expect(accordion.textContent).not.toContain("Nouvelles modifications"));
  expect(view.container.querySelector(".pending")).toBeNull();
  expect(top.container.textContent).not.toContain("Modifié");
  store.notificationByDossier.set(dossier.id, {
    ...notification(),
    changes: [{ ...change, revisions: ["revision-2" as ActionDossierId] }],
  });
  const fresh = {
    ...dossier,
    notificationSnapshot: {
      ...notification(),
      changes: [{ ...change, revisions: ["revision-2" as ActionDossierId] }],
    },
  };
  registerReviewSnapshot(fresh);
  await view.rerender({ dossier: fresh, anomalies: undefined });
  await tick();
  expect(accordion.textContent).toContain("Nouvelles modifications");
  expect(view.container.querySelector(".pending")).not.toBeNull();
  expect(top.container.textContent).toContain("Modifié");
});

test("read-only detail neither accesses personal notifications nor shows review controls", async () => {
  mode.current = true;
  const get = vi.spyOn(store.notificationByDossier, "get");
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  const badges = render(DossierNotificationBadges, { dossierId: dossier.id });
  for (const button of view.container.querySelectorAll<HTMLButtonElement>("h3 button"))
    button.click();
  await tick();
  expect(get).not.toHaveBeenCalled();
  expect(badges.container.textContent?.trim()).toBe("");
  expect(view.container.textContent).not.toContain("Nouvelles modifications");
  expect(view.container.querySelector(".pending")).toBeNull();
  expect(view.container.querySelector('[aria-label^="Valider la modification"]')).toBeNull();
  expect(store.capabilities.updateNotificationForDossier).not.toHaveBeenCalled();
  get.mockRestore();
});

test("all accordion modification badges sit on the right next to the chevron", () => {
  const snapshot = {
    ...notification(),
    changes: ["Demandeur", "Description", "especes", "piece:test"].map((field) => ({
      ...change,
      field,
      revisions: [`revision-${field}` as ActionDossierId],
    })),
  };
  const fresh = { ...dossier, notificationSnapshot: snapshot };
  store.notificationByDossier.set(dossier.id, snapshot);
  registerReviewSnapshot(fresh);
  const view = render(DossierDetailProjet, { dossier: fresh, anomalies: undefined });
  const badges = view.getAllByText("Nouvelles modifications");
  expect(badges).toHaveLength(4);
  for (const badge of badges) {
    const button = badge.closest("button")!;
    expect(badge.parentElement).toBe(button.lastElementChild);
    expect(badge.nextElementSibling).toHaveClass("fr-icon-arrow-down-s-line");
  }
});
