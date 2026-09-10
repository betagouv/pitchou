import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "@gouvfr/dsfr/dist/utility/utility.css";
import "../../../../../app.css";
import DossierDetailProjet from "../DossierDetailProjet.svelte";
import EspecesImpactees from "./EspecesImpactees.svelte";
import { groupChange, habitat, impact, speciesDossier } from "./impactGroups.fixture.ts";

const mode = vi.hoisted(() => ({ current: false }));
vi.mock("../readOnly.ts", () => ({ readOnlyMode: () => mode }));
vi.mock("$env/dynamic/public", () => ({ env: {} }));
beforeEach(() => {
  mode.current = false;
});
afterEach(cleanup);

test("three impacts count as two species; separate status badges follow names", async () => {
  const ministerial = impact({
    espece: { ...impact().espece, CD_REF: "2", especeCNPN: false, especeMinisterielle: true },
  });
  const view = render(DossierDetailProjet, {
    dossier: speciesDossier([impact(), habitat, ministerial]),
    anomalies: undefined,
  });
  const accordion = view.getByRole("button", {
    name: "Espèces impactées 2 1 CNPN 1 MINISTÉRIELLE",
  });
  expect([...accordion.querySelectorAll(".fr-badge")].map((badge) => badge.textContent)).toEqual([
    "2",
    "1 CNPN",
    "1 MINISTÉRIELLE",
  ]);
  accordion.click();
  await tick();
  expect(view.getAllByRole("table")).toHaveLength(2);
  expect(view.container.querySelectorAll("tbody tr")).toHaveLength(3);
  for (const name of view.container.querySelectorAll(".species-name")) {
    expect(name.firstElementChild?.textContent).toContain("Fou de Bassan");
    expect(name.firstElementChild?.querySelector("i")?.textContent).toBe("(Morus bassanus)");
    expect(name.lastElementChild?.classList.contains("species-status")).toBe(true);
  }
  expect(view.container.textContent).toContain("MINISTÈRE");
  expect(view.container.textContent).not.toMatch(/menac/i);
});

test("zero status counts are omitted", () => {
  const view = render(DossierDetailProjet, { dossier: speciesDossier([]), anomalies: undefined });
  const accordion = view.getByRole("button", { name: "Espèces impactées 0" });
  expect(accordion.querySelectorAll(".fr-badge")).toHaveLength(1);
});

test("only the changed table is yellow and populated method and means stay visible", () => {
  const view = render(EspecesImpactees, {
    dossier: speciesDossier([
      impact({ methode: "Filets", moyenDePoursuite: "Avion", nids: 0 }),
      habitat,
    ]),
    anomalies: undefined,
    groupChanges: new Map([["P-1", groupChange("P-1")]]),
  });
  const tables = view.getAllByRole("table");
  expect(tables[0].classList.contains("pending")).toBe(true);
  expect(tables[1].classList.contains("pending")).toBe(false);
  expect(view.getByRole("columnheader", { name: "Nb d’individus" })).toBeTruthy();
  expect(view.getByRole("cell", { name: "Filets" })).toBeTruthy();
  expect(view.getByRole("cell", { name: "Avion" })).toBeTruthy();
  expect(view.getByRole("cell", { name: "0" })).toBeTruthy();
  expect(getComputedStyle(tables[0]).backgroundColor).toBe("rgb(255, 237, 191)");
  expect(getComputedStyle(tables[1]).backgroundColor).toBe("rgb(255, 255, 255)");
});

test("legacy review is file-level and does not color any table", () => {
  const view = render(EspecesImpactees, {
    dossier: speciesDossier(),
    anomalies: undefined,
    change: { ...groupChange(null), field: "especes" },
  });
  expect(view.container.textContent).toContain("Le groupe d'impact concerné n'est pas précisé.");
  expect(view.container.querySelectorAll("table.pending")).toHaveLength(0);
  expect(view.getAllByRole("button", { name: /Valider la modification/ })).toHaveLength(1);
});

test("read-only hides all reviews, highlights and deleted groups", () => {
  mode.current = true;
  const view = render(EspecesImpactees, {
    dossier: speciesDossier(),
    anomalies: undefined,
    change: { ...groupChange(null), field: "especes" },
    groupChanges: new Map([
      ["P-1", groupChange("P-1")],
      ["removed", groupChange("removed")],
    ]),
  });
  expect(view.queryByRole("button", { name: /Valider la modification/ })).toBeNull();
  expect(view.container.querySelector(".pending")).toBeNull();
  expect(view.queryByText("removed")).toBeNull();
  expect(view.getAllByRole("table")).toHaveLength(2);
});

test("original species download stays available outside tables", async () => {
  const dossier = speciesDossier();
  dossier.especesImpactees.sourceFile = {
    name: "especes.xlsx",
    url: "/especes.xlsx",
    media_type: "application/xlsx",
  };
  const view = render(EspecesImpactees, { dossier, anomalies: Promise.resolve([]) });
  await tick();
  const download = view.getByRole("button", { name: "Télécharger le fichier original" });
  expect(download.closest("table")).toBeNull();
});

test("file anomalies retain their details, reference link and original download", async () => {
  const dossier = speciesDossier();
  dossier.especesImpactees.sourceFile = {
    name: "especes.xlsx",
    url: "/especes.xlsx",
    media_type: "application/xlsx",
  };
  const view = render(EspecesImpactees, {
    dossier,
    anomalies: Promise.resolve([
      { message: "Type d'impact inconnu", classification: "oiseau" as const, ligne: 3 },
    ]),
  });
  await tick();
  view.getByRole("button", { name: "Voir le détail" }).click();
  await tick();
  expect(view.container.textContent).toContain("Type d'impact inconnu");
  expect(view.getByRole("link", { name: /Quels types d'impact/ }).getAttribute("href")).toBe(
    "/referentiel-type-impact",
  );
  expect(view.getByRole("button", { name: "Télécharger le fichier original" })).toBeTruthy();
});
