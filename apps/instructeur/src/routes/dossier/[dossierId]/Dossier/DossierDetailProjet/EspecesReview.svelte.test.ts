import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { registerReviewSnapshot } from "$lib/dossier/notification/snapshot.ts";
import { groupChange, speciesDossier } from "./impactGroups.fixture.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierNotification, FieldChange } from "@pitchou/types/notification.ts";

vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => ({ current: false }) }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.notificationByDossier.clear();
});

async function openReview(changes: FieldChange[]) {
  const dossier = speciesDossier();
  const notification: DossierNotification = {
    dossier: dossier.id,
    viewed: false,
    updated_at: new Date("2026-09-01"),
    viewed_at: null,
    changes,
    new_arrival: null,
    new_follow: null,
  };
  dossier.notificationSnapshot = notification;
  registerReviewSnapshot(dossier);
  store.notificationByDossier.set(dossier.id, notification);
  store.capabilities = {
    updateNotificationForDossier: vi.fn().mockImplementation(async ({ revisions }) => ({
      ...notification,
      changes: store.notificationByDossier
        .get(dossier.id)!
        .changes.filter((change) => !change.revisions.every((id) => revisions.includes(id))),
    })),
  };
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  const accordion = view.getByRole("button", { name: /Espèces impactées/ });
  accordion.click();
  await tick();
  return { view, dossier, accordion, notification };
}

test("each group acknowledges only its own revisions without moving unchanged table widths", async () => {
  const first = groupChange("P-1", "Destruction");
  const second = groupChange("P-4-2", "Habitat");
  const { view, dossier, accordion } = await openReview([first, second]);
  expect(accordion.lastElementChild?.textContent).toContain("Nouvelles modifications");
  expect(view.container.querySelectorAll("table.pending")).toHaveLength(2);
  const tables = view.getAllByRole("table");
  const width = tables[0].getBoundingClientRect().width;
  view.getByRole("button", { name: "Valider la modification : Destruction" }).click();
  await vi.waitFor(() => expect(view.container.querySelectorAll("table.pending")).toHaveLength(1));
  expect(store.capabilities.updateNotificationForDossier).toHaveBeenCalledWith({
    dossier: dossier.id,
    revisions: first.revisions,
  });
  expect(tables[0].getBoundingClientRect().width).toBe(width);
  expect(view.getByRole("button", { name: "Valider la modification : Habitat" })).toBeTruthy();
  expect(accordion.textContent).toContain("Nouvelles modifications");
  view.getByRole("button", { name: "Valider la modification : Habitat" }).click();
  await vi.waitFor(() => expect(view.container.querySelector("table.pending")).toBeNull());
  expect(accordion.textContent).not.toContain("Nouvelles modifications");
});

test("deleted groups retain the snapshot label and empty yellow table until acknowledged", async () => {
  const deleted = groupChange("P-3", "Capture/relâcher immédiat");
  const { view } = await openReview([deleted]);
  const table = view.getByRole("table", { name: deleted.label });
  expect(view.getByRole("heading", { name: deleted.label })).toBeTruthy();
  expect(table.textContent).toContain("Aucune espèce impactée dans ce groupe.");
  expect(table.classList.contains("pending")).toBe(true);
  view.getByRole("button", { name: `Valider la modification : ${deleted.label}` }).click();
  await vi.waitFor(() => expect(view.queryByRole("table", { name: deleted.label })).toBeNull());
  expect(view.getAllByRole("table")).toHaveLength(2);
});

test("new group revisions cannot be acknowledged against an older detail snapshot", async () => {
  const first = groupChange("P-1", "Destruction");
  const newer = groupChange("P-4-2", "Habitat");
  const { view, dossier, notification } = await openReview([first]);
  store.notificationByDossier.set(dossier.id, { ...notification, changes: [first, newer] });
  await tick();
  expect(view.queryByRole("button", { name: "Valider la modification : Habitat" })).toBeNull();
  expect(view.getByRole("button", { name: "Actualiser les modifications" })).toBeTruthy();
  const fresh: DossierFull = {
    ...dossier,
    notificationSnapshot: { ...notification, changes: [first, newer] },
  };
  registerReviewSnapshot(fresh);
  await view.rerender({ dossier: fresh, anomalies: undefined });
  expect(view.getByRole("button", { name: "Valider la modification : Habitat" })).toBeTruthy();
  expect(view.container.querySelectorAll("table.pending")).toHaveLength(2);
});
