import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";

vi.mock(import("../../actions/décisionAdministrative.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    supprimerDécisionAdministrative: vi.fn(),
    sauvegardeNouvelleDécisionAdministrative: vi.fn(),
  };
});

vi.mock(import("../../actions/dossier.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshDossierComplet: vi.fn(),
  };
});

import DossierContrôles from "./DossierContrôles.svelte";
import { supprimerDécisionAdministrative } from "../../actions/décisionAdministrative.ts";
import { refreshDossierComplet } from "../../actions/dossier.ts";
import { reactive } from "../../../../tests/helpers/reactive.svelte.ts";
import type { DossierComplet, FrontEndDécisionAdministrative } from "../../../types/API_Pitchou.ts";

let dossier: DossierComplet;
// Minimal "database" shared between the mocks: deletion empties it, refresh
// copies its state back into the reactive dossier, like a server reload.
let fakeDB: FrontEndDécisionAdministrative[];

beforeEach(() => {
  const decision = {
    id: "decision-1",
    dossier: "dossier-1",
    type: "Arrêté dérogation",
    numéro: "AP-001",
  } as unknown as FrontEndDécisionAdministrative;

  fakeDB = [decision];

  dossier = reactive({
    id: "dossier-1",
    nom: "Dossier test",
    décisionsAdministratives: [...fakeDB],
    évènementsPhase: [],
  } as unknown as DossierComplet);

  vi.mocked(supprimerDécisionAdministrative).mockReset();
  vi.mocked(supprimerDécisionAdministrative).mockImplementation(async (id) => {
    fakeDB = fakeDB.filter((d) => d.id !== id);
  });

  vi.mocked(refreshDossierComplet).mockReset();
  // Refresh reflects the real "database" state, like reloading from the server.
  vi.mocked(refreshDossierComplet).mockImplementation(async () => {
    dossier.décisionsAdministratives = [...fakeDB];
    return dossier;
  });
});

afterEach(cleanup);

test("la décision disparaît de la liste après suppression, sans recharger la page", async () => {
  render(DossierContrôles, { dossier });

  await expect.element(page.getByRole("heading", { name: /AP-001/ })).toBeVisible();

  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();

  // It disappears from the rendered list without a manual reload.
  await expect.element(page.getByRole("heading", { name: /AP-001/ })).not.toBeInTheDocument();
  await expect
    .element(page.getByText(/pas de décisions administrative à contrôler/i))
    .toBeVisible();

  expect(supprimerDécisionAdministrative).toHaveBeenCalledTimes(1);
});
