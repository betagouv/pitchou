import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import Prescription from "./Prescription.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { reactive } from "../../../../../../../tests/helpers/reactive.svelte.ts";
import type { FrontEndPrescription } from "@pitchou/types/API_Pitchou.ts";
import type Controle from "@pitchou/types/database/public/Controle.ts";
import type { PrescriptionId } from "@pitchou/types/database/public/Prescription.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

test("editing the first control keeps one control and preserves its identity", async () => {
  const controle: Controle = {
    id: "controle-1" as Controle["id"],
    prescription: "prescription-1" as PrescriptionId,
    controle_date: new Date("2026-01-01"),
    result: "Conforme",
    comment: "Initial",
    post_controle_action_type: null,
    post_controle_action_date: null,
    next_due_date: null,
  };
  const prescription = reactive<Partial<FrontEndPrescription>>({
    id: controle.prescription,
    description: "Prescription",
    controles: [controle],
  });
  const update = vi.fn().mockResolvedValue(1);
  store.capabilities.addOrUpdateControle = update;
  const { container } = render(Prescription, {
    prescription,
    refreshDossierFull: vi.fn(),
  });
  container.querySelector("details")!.open = true;
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  const textarea = container.querySelector("textarea")!;
  textarea.value = "Modifié";
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => update).toHaveBeenCalledOnce();
  await expect
    .element(page.getByRole("heading", { name: "1 contrôle", exact: true }))
    .toBeVisible();
  expect(prescription.controles).toHaveLength(1);
  expect(prescription.controles?.[0]).toMatchObject({
    id: controle.id,
    prescription: controle.prescription,
    comment: "Modifié",
  });
});
