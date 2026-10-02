import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import { store } from "$lib/state/store.svelte.ts";
import DossiersExportButton from "./DossiersExportButton.svelte";
import { dossierId, makeQuery } from "./testHelpers.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
  vi.restoreAllMocks();
});

test.each([false, true])(
  "downloads the selected filtered dossiers and tracks the export click, followed=%s",
  async (followedOnly) => {
    const exporterDossiers = vi.fn().mockResolvedValue(new Blob(["export"]));
    const creerEvenementMetrique = vi.fn().mockResolvedValue(undefined);
    store.capabilities = { exporterDossiers, creerEvenementMetrique };
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createUrl = vi.spyOn(URL, "createObjectURL");
    const dossierIds = [dossierId(2), dossierId(5)];
    render(DossiersExportButton, {
      followedOnly,
      dossierIds,
      chips: [{ key: "phase:Instruction", label: "Instruction", next: makeQuery() }],
    });
    await page.getByRole("button", { name: "Exporter les dossiers", exact: true }).click();
    expect(creerEvenementMetrique).toHaveBeenCalledWith({
      type: "clickExportDossiers",
      details: { page: followedOnly ? "mes-dossiers" : "tous-les-dossiers" },
    });
    await expect.element(page.getByRole("dialog")).toBeVisible();
    await expect.element(page.getByText("2 dossiers", { exact: true })).toBeVisible();
    await expect.element(page.getByText("Instruction", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Format du fichier" }).click();
    await page.getByRole("option", { name: "CSV, compatible avec Grist" }).click();
    await page.getByRole("button", { name: "Télécharger l'export" }).click();
    await expect.element(page.getByRole("dialog", { includeHidden: true })).not.toBeVisible();
    expect(exporterDossiers).toHaveBeenCalledWith(
      followedOnly ? "followed" : "service",
      "csv",
      dossierIds,
    );
    expect(createUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(creerEvenementMetrique).toHaveBeenCalledTimes(2);
    expect(creerEvenementMetrique).toHaveBeenLastCalledWith({
      type: "downloadDossiersExport",
      details: {
        page: followedOnly ? "mes-dossiers" : "tous-les-dossiers",
        format: "csv",
        scope: followedOnly ? "followed" : "service",
        dossierCount: 2,
      },
    });
  },
);

test("prevents duplicate exports and allows retry after failure", async () => {
  let reject!: (error: Error) => void;
  const exporterDossiers = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    )
    .mockResolvedValue(new Blob(["export"]));
  const creerEvenementMetrique = vi.fn().mockResolvedValue(undefined);
  store.capabilities = { exporterDossiers, creerEvenementMetrique };
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(DossiersExportButton, { dossierIds: [dossierId(1)] });
  await page.getByRole("button", { name: "Exporter les dossiers", exact: true }).click();
  await page.getByRole("button", { name: "Télécharger l'export" }).click();
  await expect.element(page.getByRole("button", { name: "Export en cours…" })).toBeDisabled();
  reject(new Error("Network failed"));
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("L'export des dossiers a échoué. Veuillez réessayer.");
  expect(creerEvenementMetrique).toHaveBeenCalledOnce();
  await page.getByRole("button", { name: "Télécharger l'export" }).click();
  expect(exporterDossiers).toHaveBeenCalledTimes(2);
  expect(exporterDossiers).toHaveBeenLastCalledWith("service", "ods", [dossierId(1)]);
  await expect.poll(() => creerEvenementMetrique.mock.calls.length).toBe(2);
  expect(creerEvenementMetrique).toHaveBeenLastCalledWith({
    type: "downloadDossiersExport",
    details: { page: "tous-les-dossiers", format: "ods", scope: "service", dossierCount: 1 },
  });
});

test("shows an empty result count and disables downloading", async () => {
  store.capabilities = { exporterDossiers: vi.fn() };
  render(DossiersExportButton, { dossierIds: [] });
  await page.getByRole("button", { name: "Exporter les dossiers", exact: true }).click();
  await expect.element(page.getByText("0 dossier", { exact: true })).toBeVisible();
  await expect.element(page.getByRole("button", { name: "Télécharger l'export" })).toBeDisabled();
});
