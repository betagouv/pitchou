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

test("la date peut être saisie dans le champ", async () => {
  renderPrescriptions();

  await page.getByRole("button", { name: "Ajouter une prescription" }).click();

  const input = page.getByLabelText("Date", { exact: true });
  await input.fill("n'importe quoi");
  await expect.element(input).toHaveValue("");

  await input.fill("260520261234");
  await expect.element(input).toHaveValue("26/05/2026");

  await input.fill("99999999");
  await expect.element(input).toHaveValue("99/99/9999");
  await expect.element(input).toHaveAttribute("aria-invalid", "true");
  input.element().blur();
  await expect.element(input).toHaveValue("26/05/2026");

  await input.fill("");
  await input.fill("26/05/2026");

  await expect.element(input).toHaveValue("26/05/2026");

  await page.getByRole("button", { name: "Modifications terminées" }).click();
  expect(store.capabilities.addOrUpdatePrescription).toHaveBeenCalledWith(
    expect.objectContaining({ due_date: expect.any(Date) }),
  );
});

test("la date sélectionnée dans le calendrier s'affiche dans le champ date", async () => {
  renderPrescriptions();

  await page.getByRole("button", { name: "Ajouter une prescription" }).click();

  // Open the date picker by clicking the date field
  await page.getByLabelText("Date", { exact: true }).click();

  // Pick the 15th of the displayed month (the day buttons are labelled with the full date)
  const target = new Date();
  target.setDate(15);
  await page
    .getByRole("button", { name: format(target, "EEEE d MMMM yyyy", { locale: fr }) })
    .click();

  // The field must display the picked date instead of the empty placeholder
  await expect
    .element(page.getByLabelText("Date", { exact: true }))
    .toHaveValue(format(target, "dd/MM/yyyy"));
});
