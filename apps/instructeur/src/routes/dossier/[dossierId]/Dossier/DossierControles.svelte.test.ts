import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";

vi.mock(import("./Controles/decisionAdministrative.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    deleteDecisionAdministrative: vi.fn(),
    saveNewDecisionAdministrative: vi.fn(),
  };
});

vi.mock(import("$lib/dossier/dossier.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    refreshDossierFull: vi.fn(),
  };
});

import DossierControles from "./DossierControles.svelte";
import { deleteDecisionAdministrative } from "./Controles/decisionAdministrative.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { reactive } from "../../../../../tests/helpers/reactive.svelte.ts";
import type { DossierFull, FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";

let dossier: DossierFull;
// Minimal "database" shared between the mocks: deletion empties it, refresh
// copies its state back into the reactive dossier, like a server reload.
let fakeDB: FrontEndDecisionAdministrative[];

beforeEach(() => {
  const decision = {
    id: "decision-1",
    dossier: "dossier-1",
    type: "Arrêté dérogation",
    numéro: "AP-001",
  } as unknown as FrontEndDecisionAdministrative;

  fakeDB = [decision];

  dossier = reactive({
    id: "dossier-1",
    nom: "Dossier test",
    décisionsAdministratives: [...fakeDB],
    évènementsPhase: [],
  } as unknown as DossierFull);

  vi.mocked(deleteDecisionAdministrative).mockReset();
  vi.mocked(deleteDecisionAdministrative).mockImplementation(async (id) => {
    fakeDB = fakeDB.filter((d) => d.id !== id);
  });

  vi.mocked(refreshDossierFull).mockReset();
  // Refresh reflects the real "database" state, like reloading from the server.
  vi.mocked(refreshDossierFull).mockImplementation(async () => {
    dossier.décisionsAdministratives = [...fakeDB];
    return dossier;
  });
});

afterEach(cleanup);

test("la décision disparaît de la liste après suppression, sans recharger la page", async () => {
  render(DossierControles, { dossier });

  await expect.element(page.getByRole("heading", { name: /AP-001/ })).toBeVisible();

  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();

  // It disappears from the rendered list without a manual reload.
  await expect.element(page.getByRole("heading", { name: /AP-001/ })).not.toBeInTheDocument();
  await expect
    .element(page.getByText(/pas de décisions administrative à contrôler/i))
    .toBeVisible();

  expect(deleteDecisionAdministrative).toHaveBeenCalledTimes(1);
});
