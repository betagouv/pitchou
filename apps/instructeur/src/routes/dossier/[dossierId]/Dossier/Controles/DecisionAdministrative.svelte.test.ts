import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";

import DecisionAdministrative from "./DecisionAdministrative.svelte";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 1 as Dossier["id"];

afterEach(cleanup);

/** Fresh reactive decision per render, mirroring the $state parents pass in. */
function decision(
  overrides: Partial<FrontEndDecisionAdministrative> = {},
): FrontEndDecisionAdministrative {
  return reactive({
    id: "decision-1",
    type: "Arrêté dérogation",
    numéro: "AP-001",
    ...overrides,
  } as FrontEndDecisionAdministrative);
}

function renderInModifyMode(deleteDecisionAdministrative: () => Promise<unknown>) {
  render(DecisionAdministrative, {
    dossierId: DOSSIER_ID,
    décisionAdministrative: decision(),
    deleteDecisionAdministrative,
  });
  return page.getByRole("button", { name: "Modifier" }).click();
}

test("ne supprime pas immédiatement : un clic sur Supprimer demande d'abord confirmation", async () => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(deleteFn);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();

  // A confirmation is requested and nothing is deleted until it is confirmed.
  await expect.element(page.getByRole("alertdialog")).toBeVisible();
  expect(deleteFn).not.toHaveBeenCalled();
});

test("supprime la décision une fois la confirmation validée", async () => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(deleteFn);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();

  await vi.waitFor(() => expect(deleteFn).toHaveBeenCalledTimes(1));
});

test("annuler la confirmation ne supprime pas la décision", async () => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(deleteFn);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Annuler" }).click();

  await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
  expect(deleteFn).not.toHaveBeenCalled();
});
