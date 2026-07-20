import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import AvisExpert from "./AvisExpert.svelte";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 1 as Dossier["id"];

afterEach(cleanup);

test("deletes an avis only after explicit confirmation", async () => {
  const deleteAvisExpert = vi.fn().mockResolvedValue(undefined);
  const avisExpert = reactive({
    id: "avis-expert-1",
    dossier: DOSSIER_ID,
    expert: "CNPN",
    avis: "Avis favorable",
    saisine_date: null,
    avis_date: null,
  } as unknown as FrontEndAvisExpert);

  render(AvisExpert, { dossierId: DOSSIER_ID, avisExpert, deleteAvisExpert });

  await page.getByRole("button", { name: "Modifier" }).click();
  await page.getByRole("button", { name: "Supprimer cet avis d'expert" }).click();

  expect(deleteAvisExpert).not.toHaveBeenCalled();
  await expect.element(page.getByRole("alertdialog")).toBeVisible();

  await page.getByRole("button", { name: "Confirmer la suppression" }).click();

  await vi.waitFor(() => expect(deleteAvisExpert).toHaveBeenCalledTimes(1));
  await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
});
