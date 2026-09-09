import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import { groupChange, habitat, impact, speciesDossier } from "./impactGroups.fixture.ts";
import { store } from "$lib/state/store.svelte.ts";
import { registerReviewSnapshot } from "$lib/dossier/notification/snapshot.ts";

vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => ({ current: false }) }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
afterEach(async () => {
  cleanup();
  store.notificationByDossier.clear();
  await page.viewport(1280, 720);
});

test.each([1440, 390, 320])("species tables and reviews fit a %ipx viewport", async (width) => {
  await page.viewport(width, 900);
  const dossier = speciesDossier([
    impact({ methode: "Une méthode sélective", moyenDePoursuite: "Avion", nids: 0, oeufs: 4 }),
    {
      ...habitat,
      espece: { ...habitat.espece, CD_REF: "2", especeCNPN: false, especeMinisterielle: true },
    },
  ]);
  dossier.especesImpactees.sourceFile = {
    name: "especes.xlsx",
    url: "/especes.xlsx",
    media_type: "application/xlsx",
  };
  const change = groupChange("P-1", "Destruction/mutilation de spécimens");
  dossier.notificationSnapshot = {
    dossier: dossier.id,
    viewed: false,
    updated_at: change.detected_at,
    viewed_at: null,
    changes: [change],
    new_arrival: null,
    new_follow: null,
  };
  store.notificationByDossier.set(dossier.id, dossier.notificationSnapshot);
  registerReviewSnapshot(dossier);
  const view = render(DossierDetailProjet, { dossier, anomalies: undefined });
  const accordion = view.getByRole("button", { name: /Espèces impactées/ });
  accordion.click();
  await tick();
  await document.fonts.ready;
  const detail = view.container.querySelector<HTMLElement>(".species-detail")!;
  const fileRow = detail.querySelector<HTMLElement>(":scope > .review-row")!;
  const groups = [...detail.querySelectorAll<HTMLElement>(".impact-group")];
  expect(getComputedStyle(detail).paddingTop).toBe("8px");
  expect(groups[0].getBoundingClientRect().top - fileRow.getBoundingClientRect().bottom).toBe(16);
  expect(groups[1].getBoundingClientRect().top - groups[0].getBoundingClientRect().bottom).toBe(48);
  const scrolls = [...view.container.querySelectorAll<HTMLElement>(".table-scroll")];
  const control = view.container.querySelector<HTMLElement>(".field-change")!;
  const table = scrolls[0].getBoundingClientRect();
  const review = control.getBoundingClientRect();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  for (const element of [
    ...scrolls,
    control,
    accordion,
    ...accordion.querySelectorAll(".fr-badge"),
  ]) {
    expect(element.getBoundingClientRect().right).toBeLessThanOrEqual(width);
  }
  expect(scrolls[1].getBoundingClientRect().width).toBe(table.width);
  if (width > 768) {
    expect(review.left).toBeGreaterThan(table.right);
    expect(review.top + review.height / 2).toBeCloseTo(table.top + table.height / 2, 0);
    const heading = view.container.querySelector(".impact-group h4")!.getBoundingClientRect();
    expect(table.top - heading.bottom).toBe(32);
    expect(getComputedStyle(scrolls[0].querySelector("th")!).backgroundColor).toBe(
      "rgb(255, 237, 191)",
    );
    expect(getComputedStyle(scrolls[1].querySelector("th")!).backgroundColor).toBe(
      "rgb(246, 246, 246)",
    );
  } else {
    expect(review.top).toBeGreaterThanOrEqual(table.bottom);
    expect(scrolls[0].scrollWidth).toBeGreaterThan(scrolls[0].clientWidth);
  }
});
