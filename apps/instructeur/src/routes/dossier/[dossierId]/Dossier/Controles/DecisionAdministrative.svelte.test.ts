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

function renderInModifyMode(supprimerDecisionAdministrative: () => Promise<unknown>) {
  render(DecisionAdministrative, {
    dossierId: DOSSIER_ID,
    décisionAdministrative: decision(),
    supprimerDecisionAdministrative,
  });
  return page.getByRole("button", { name: "Modifier" }).click();
}

test("ne supprime pas immédiatement : un clic sur Supprimer demande d'abord confirmation", async () => {
  const supprimer = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(supprimer);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();

  // A confirmation is requested and nothing is deleted until it is confirmed.
  await expect.element(page.getByRole("alertdialog")).toBeVisible();
  expect(supprimer).not.toHaveBeenCalled();
});

test("supprime la décision une fois la confirmation validée", async () => {
  const supprimer = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(supprimer);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();

  await vi.waitFor(() => expect(supprimer).toHaveBeenCalledTimes(1));
});

test("annuler la confirmation ne supprime pas la décision", async () => {
  const supprimer = vi.fn().mockResolvedValue(undefined);
  await renderInModifyMode(supprimer);

  await page.getByRole("button", { name: "Supprimer cette décision administrative" }).click();

  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Annuler" }).click();

  await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
  expect(supprimer).not.toHaveBeenCalled();
});
