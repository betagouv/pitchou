import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { page, userEvent } from "vitest/browser";
import { store } from "$lib/state/store.svelte.ts";
import ProjectField from "./ReviewFieldFixture.svelte";
import FieldChangeControl from "./FieldChange.svelte";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierNotification, FieldChange } from "@pitchou/types/notification.ts";

const dossierId = 123 as DossierId;
const change: FieldChange = {
  field: "Description",
  label: "Description",
  revisions: ["revision-1" as ActionDossierId],
  detected_at: new Date("2026-09-01T12:00:00Z"),
  modified_at: null,
};
const state = (): DossierNotification => ({
  dossier: dossierId,
  viewed: false,
  updated_at: change.detected_at,
  viewed_at: null,
  new_arrival: null,
  new_follow: null,
  changes: [change],
});
beforeEach(() => {
  store.notificationByDossier.set(dossierId, state());
});
afterEach(() => {
  cleanup();
  store.notificationByDossier.clear();
  store.capabilities = {};
});

test("cleared values remain highlighted with the fallback date and a visible Vu button", () => {
  const view = render(ProjectField, { dossierId, label: "Description", value: null, change });
  expect(view.container.textContent).toContain("Non renseigné");
  expect(view.container.textContent?.replace(/\s+/g, " ")).toContain("Modifié le 01/09/2026");
  expect(view.container.textContent).not.toMatch(/détecté/i);
  expect(view.container.querySelector("button")?.textContent?.trim()).toBe("Vu");
  expect(view.container.querySelector(".fr-icon-check-line")?.getAttribute("aria-hidden")).toBe(
    "true",
  );
  expect(view.container.querySelector(".field-value")?.classList.contains("pending")).toBe(true);
  expect(
    view.container
      .querySelector(".pending")
      ?.contains(view.container.querySelector(".field-change")),
  ).toBe(false);
  expect(view.container.querySelector("button")?.getAttribute("aria-label")).toBe(
    "Valider la modification : Description",
  );
});

test("review waits for server persistence before updating the global aggregate", async () => {
  let resolve!: (notification: DossierNotification) => void;
  const update = vi.fn(
    () =>
      new Promise<DossierNotification>((done) => {
        resolve = done;
      }),
  );
  store.capabilities = { updateNotificationForDossier: update };
  const view = render(ProjectField, {
    dossierId,
    label: "Description",
    value: "Nouvelle description",
    change,
  });
  view.container.querySelector("button")!.click();
  await tick();
  await vi.waitFor(() =>
    expect(update).toHaveBeenCalledExactlyOnceWith({
      dossier: dossierId,
      revisions: ["revision-1"],
    }),
  );
  expect(store.notificationByDossier.get(dossierId)?.viewed).toBe(false);
  expect(view.container.querySelector("button")?.disabled).toBe(true);
  expect(view.container.querySelector("button")?.getAttribute("aria-busy")).toBe("true");
  view.container.querySelector("button")!.click();
  expect(update).toHaveBeenCalledTimes(1);
  resolve({ ...state(), viewed: true, changes: [] });
  await vi.waitFor(() => expect(store.notificationByDossier.get(dossierId)?.viewed).toBe(true));
});

test("failed persistence keeps the pending field and lets the user retry", async () => {
  const update = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({
      ...state(),
      viewed: true,
      changes: [],
    });
  store.capabilities = {
    updateNotificationForDossier: update,
  };
  const view = render(ProjectField, { dossierId, label: "Description", value: "Texte", change });
  view.container.querySelector("button")!.click();
  await vi.waitFor(() =>
    expect(view.container.querySelector("[role=alert]")?.textContent).toContain("Échec"),
  );
  expect(store.notificationByDossier.get(dossierId)?.changes).toEqual([change]);
  expect(view.container.querySelector("button")?.disabled).toBe(false);
  expect(view.container.querySelector(".pending")).not.toBeNull();
  await page.getByRole("button", { name: "Valider la modification : Description" }).click();
  await vi.waitFor(() => expect(store.notificationByDossier.get(dossierId)?.viewed).toBe(true));
  expect(update).toHaveBeenCalledTimes(2);
  expect(view.container.querySelector("[role=alert]")).toBeNull();
});

test("review is disabled without an atomic displayed snapshot", () => {
  const update = vi.fn();
  store.capabilities = { updateNotificationForDossier: update };
  const view = render(FieldChangeControl, { dossierId, change });
  expect(view.container.querySelector("button")?.disabled).toBe(true);
  view.container.querySelector("button")!.click();
  expect(update).not.toHaveBeenCalled();
});

test("a revision no longer bound to the displayed snapshot cannot be acknowledged", async () => {
  const update = vi.fn();
  store.capabilities = { updateNotificationForDossier: update };
  const view = render(ProjectField, { dossierId, label: "Description", value: "Texte", change });
  store.notificationByDossier.set(dossierId, {
    ...state(),
    changes: [{ ...change, revisions: ["revision-2" as ActionDossierId] }],
  });
  view.container.querySelector("button")!.click();
  await tick();
  expect(update).not.toHaveBeenCalled();
  expect(view.container.querySelector("[role=alert]")?.textContent).toContain("Échec");
});

test("the review button is keyboard accessible with a visible focus indicator", async () => {
  store.capabilities = {
    updateNotificationForDossier: vi
      .fn()
      .mockResolvedValue({ ...state(), viewed: true, changes: [] }),
  };
  const view = render(ProjectField, { dossierId, label: "Description", value: "Texte", change });
  const button = view.container.querySelector("button")!;
  await page.getByText("Texte", { exact: true }).click();
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(button);
  expect(getComputedStyle(button).outlineStyle).toBe("solid");
  expect(getComputedStyle(button).outlineWidth).toBe("2px");
  await userEvent.keyboard("{Enter}");
  await vi.waitFor(() =>
    expect(store.capabilities.updateNotificationForDossier).toHaveBeenCalledExactlyOnceWith({
      dossier: dossierId,
      revisions: ["revision-1"],
    }),
  );
});
