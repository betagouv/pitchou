import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import Prescriptions from "./Prescriptions.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 1 as Dossier["id"];

beforeEach(() => {
  // The component saves through this capability on focusout; the resolved
  // object mirrors the server response shape read in savePrescription.
  store.capabilities.addOrUpdatePrescription = vi
    .fn()
    .mockResolvedValue({ prescriptionId: 1 } as any);
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

function renderPrescriptions() {
  const decisionAdministrative = reactive({
    id: "decision-1",
    numéro: "AP-001",
    prescriptions: [],
  } as unknown as FrontEndDecisionAdministrative);

  return render(Prescriptions, { dossierId: DOSSIER_ID, decisionAdministrative });
}

test("la date sélectionnée dans le calendrier s'affiche dans le champ date", async () => {
  renderPrescriptions();

  await page.getByRole("button", { name: "Ajouter une prescription" }).click();

  // Open the date picker of the new prescription row
  await page.getByRole("button", { name: "Date : jj/mm/aaaa" }).click();

  // Pick the 15th of the displayed month (the day buttons are labelled with the full date)
  const target = new Date();
  target.setDate(15);
  await page
    .getByRole("button", { name: format(target, "EEEE d MMMM yyyy", { locale: fr }) })
    .click();

  // The field must display the picked date instead of the empty placeholder
  await expect
    .element(page.getByRole("button", { name: `Date : ${format(target, "dd/MM/yyyy")}` }))
    .toBeVisible();
});
