import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import { afterEach, beforeEach, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import { store } from "$lib/state/store.svelte.ts";
import ProjectField from "./ReviewFieldFixture.svelte";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { ActionDossierId } from "@pitchou/types/database/public/ActionDossier.ts";
import type { FieldChange } from "@pitchou/types/notification.ts";

const dossierId = 123 as DossierId;
const change: FieldChange = {
  field: "Description",
  label: "Description",
  revisions: ["revision-1" as ActionDossierId],
  detected_at: new Date("2026-09-01T12:00:00Z"),
  modified_at: null,
};
beforeEach(() => {
  store.notificationByDossier.set(dossierId, {
    viewed: false,
    updated_at: change.detected_at,
    viewed_at: null,
    new_arrival: null,
    new_follow: null,
    changes: [change],
  });
});
afterEach(() => {
  cleanup();
  store.notificationByDossier.clear();
  store.capabilities = {};
});

test("desktop review control sits to the right, outside the highlight, with the recorded applicant date", async () => {
  await page.viewport(1280, 720);
  const view = render(ProjectField, {
    dossierId,
    label: "Description",
    value: "Texte modifié\n".repeat(8),
    change: { ...change, modified_at: new Date("2026-08-31T12:00:00Z") },
  });
  const highlight = view.container.querySelector<HTMLElement>(".pending")!;
  const control = view.container.querySelector<HTMLElement>(".field-change")!;
  const button = control.querySelector("button")!;
  await document.fonts.ready;
  expect(control.textContent?.replace(/\s+/g, " ")).toContain("Modifié le 31/08/2026");
  expect(control.textContent).not.toContain("détectée");
  expect(control.getBoundingClientRect().left).toBeGreaterThan(
    highlight.getBoundingClientRect().right,
  );
  expect(highlight.contains(control)).toBe(false);
  expect(getComputedStyle(highlight).padding).toBe("16px");
  expect(getComputedStyle(highlight).borderRadius).toBe("4px");
  expect(getComputedStyle(highlight).backgroundColor).toBe("rgb(255, 237, 191)");
  expect(getComputedStyle(control).backgroundColor).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(control).padding).toBe("16px");
  expect(getComputedStyle(control).borderRadius).toBe("4px");
  expect(getComputedStyle(control).boxShadow).toBe("none");
  expect(getComputedStyle(control).filter).toContain("drop-shadow(");
  expect(getComputedStyle(control).fontSize).toBe("16px");
  expect(getComputedStyle(button).color).toBe("rgb(255, 255, 255)");
  expect(getComputedStyle(button).backgroundColor).toBe("rgb(0, 0, 145)");
  expect(getComputedStyle(button).borderRadius).toBe("4px");
  expect(button.getBoundingClientRect().width).toBeGreaterThan(48);
  expect(button.getBoundingClientRect().height).toBe(32);
  const bounds = control.getBoundingClientRect();
  const fieldBounds = highlight.getBoundingClientRect();
  expect(bounds.width).toBeGreaterThan(250);
  expect(bounds.width).toBeLessThan(320);
  expect(bounds.right).toBe(
    view.container.querySelector(".project-field")!.getBoundingClientRect().right,
  );
  expect(bounds.top + bounds.height / 2).toBeCloseTo(fieldBounds.top + fieldBounds.height / 2, 0);
  const notch = getComputedStyle(control, "::before");
  expect(notch.content).toBe('""');
  expect(notch.borderRightColor).toBe("rgb(255, 255, 255)");
  expect(notch.borderRightWidth).toBe("8px");
  expect(parseFloat(notch.right)).toBeCloseTo(bounds.width, 2);
  expect(parseFloat(notch.top)).toBeCloseTo(bounds.height / 2, 0);
});

test.each([320, 390, 768])(
  "the field and its review control fit a %ipx viewport",
  async (width) => {
    await page.viewport(width, 844);
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
      expect(control.getBoundingClientRect().width).toBeLessThan(320);
      expect(getComputedStyle(control, "::before").display).toBe("none");
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    } finally {
      await page.viewport(1280, 720);
    }
  },
);
