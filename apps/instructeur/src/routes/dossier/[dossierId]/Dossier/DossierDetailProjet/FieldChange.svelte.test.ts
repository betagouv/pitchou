import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { page } from "vitest/browser";
import { store } from "$lib/state/store.svelte.ts";
import ProjectField from "./ReviewFieldFixture.svelte";
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

test("cleared values remain highlighted with an honest date and a circular review button", () => {
  const view = render(ProjectField, { dossierId, label: "Description", value: null, change });
  expect(view.container.textContent).toContain("Non renseigné");
  expect(view.container.textContent?.replace(/\s+/g, " ")).toContain(
    "Modification détectée le 01/09/2026",
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

test("desktop review control sits to the right, outside the highlight, with the recorded applicant date", async () => {
  await page.viewport(1280, 720);
  const view = render(ProjectField, {
    dossierId,
    label: "Description",
    value: "Texte modifié",
    change: { ...change, modified_at: new Date("2026-08-31T12:00:00Z") },
  });
  const highlight = view.container.querySelector<HTMLElement>(".pending")!;
  const control = view.container.querySelector<HTMLElement>(".field-change")!;
  const button = control.querySelector("button")!;
  expect(control.textContent?.replace(/\s+/g, " ")).toContain("Modifié le 31/08/2026");
  expect(control.textContent).not.toContain("détectée");
  expect(control.getBoundingClientRect().left).toBeGreaterThan(
    highlight.getBoundingClientRect().right,
  );
  expect(highlight.contains(control)).toBe(false);
  expect(getComputedStyle(highlight).padding).toBe("16px");
  expect(getComputedStyle(highlight).borderRadius).toBe("4px");
  expect(getComputedStyle(control).backgroundColor).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(control).borderTopWidth).toBe("1px");
  expect(getComputedStyle(control).fontSize).toBe("16px");
  expect(getComputedStyle(button).color).toBe("rgb(102, 102, 102)");
  expect(button.getBoundingClientRect().width).toBe(32);
  expect(button.getBoundingClientRect().height).toBe(32);
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
  resolve({ ...state(), viewed: true, changes: [] });
  await vi.waitFor(() => expect(store.notificationByDossier.get(dossierId)?.viewed).toBe(true));
});

test("failed persistence keeps the pending field and lets the user retry", async () => {
  store.capabilities = {
    updateNotificationForDossier: vi.fn().mockRejectedValue(new Error("offline")),
  };
  const view = render(ProjectField, { dossierId, label: "Description", value: "Texte", change });
  view.container.querySelector("button")!.click();
  await vi.waitFor(() =>
    expect(view.container.querySelector("[role=alert]")?.textContent).toContain("Échec"),
  );
  expect(store.notificationByDossier.get(dossierId)?.changes).toEqual([change]);
  expect(view.container.querySelector("button")?.disabled).toBe(false);
});

test("the field and its review control fit a narrow viewport", async () => {
  await page.viewport(390, 844);
  try {
    const view = render(ProjectField, {
      dossierId,
      label: "Description",
      value: "UnTexteSansEspaces".repeat(40),
      change,
    });
    const button = view.container.querySelector("button")!;
    const highlight = view.container.querySelector<HTMLElement>(".pending")!;
    const control = view.container.querySelector<HTMLElement>(".field-change")!;
    expect(control.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      highlight.getBoundingClientRect().bottom,
    );
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  } finally {
    await page.viewport(1280, 720);
  }
});
