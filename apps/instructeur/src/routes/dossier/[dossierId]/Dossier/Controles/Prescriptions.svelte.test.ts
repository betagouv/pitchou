import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "@testing-library/svelte";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createOdsFile } from "@odfjs/odfjs";
import { tick } from "svelte";

vi.mock(import("$lib/dossier/dossier.ts"), () => ({ refreshDossierFull: vi.fn() }));

import { refreshDossierFull } from "$lib/dossier/dossier.ts";

import Prescriptions from "./Prescriptions.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 1 as Dossier["id"];

beforeEach(() => {
  vi.mocked(refreshDossierFull).mockReset();
  store.capabilities.addPrescriptionsAndControles = vi.fn().mockResolvedValue(undefined);
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
    number: "AP-001",
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

async function chooseFile(container: HTMLElement, description = "Prescription importée") {
  const buffer = await createOdsFile(
    new Map([
      [
        "Prescriptions",
        [[{ value: "Description", type: "string" }], [{ value: description, type: "string" }]],
      ],
    ]),
  );
  const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
  const transfer = new DataTransfer();
  transfer.items.add(new File([buffer], "prescriptions.ods"));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

test("accepts a dropped ODS file and lets the user remove it before import", async () => {
  renderPrescriptions();
  const dropZone = page.getByRole("group", { name: "Ajout d'un fichier de prescriptions" });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(new File(["contents"], "prescriptions.ods"));
  dropZone.element().dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
  await expect.element(page.getByText("prescriptions.ods", { exact: true })).toBeVisible();
  await expect
    .element(page.getByRole("button", { name: "Importer les prescriptions" }))
    .toBeEnabled();
  expect(store.capabilities.addPrescriptionsAndControles).not.toHaveBeenCalled();
  await page.getByRole("button", { name: "Retirer prescriptions.ods" }).click();
  await expect
    .element(page.getByRole("button", { name: "Importer les prescriptions" }))
    .toBeDisabled();
  dataTransfer.items.clear();
  dataTransfer.items.add(new File(["contents"], "document.pdf"));
  dropZone.element().dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Sélectionnez un seul fichier au format ODS.");
});

test("imports on confirmation, shows progress, and edits the saved prescription", async () => {
  const { container } = renderPrescriptions();
  const button = page.getByRole("button", { name: "Importer les prescriptions" });
  await expect.element(button).toBeDisabled();
  await chooseFile(container);
  expect(store.capabilities.addPrescriptionsAndControles).not.toHaveBeenCalled();

  const pending = Promise.withResolvers<Awaited<ReturnType<typeof refreshDossierFull>>>();
  vi.mocked(refreshDossierFull).mockReturnValue(pending.promise);
  await button.click();
  await expect.element(page.getByRole("button", { name: "Import en cours…" })).toBeDisabled();
  await expect.poll(() => store.capabilities.addPrescriptionsAndControles).toHaveBeenCalledTimes(1);
  pending.resolve({
    decisionsAdministratives: [
      {
        id: "decision-1",
        prescriptions: [
          {
            id: "saved-prescription",
            decision_administrative: "decision-1",
            description: "Prescription importée",
          },
        ],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof refreshDossierFull>>);
  await expect.element(page.getByRole("status")).toHaveTextContent("1 prescription importée.");
  await expect.element(page.getByRole("heading", { name: /Prescription importée/ })).toBeVisible();
  await page.getByRole("button", { name: "Modifier les prescriptions" }).click();
  const description = container.querySelector<HTMLInputElement>("tbody td:nth-child(2) input")!;
  description.value = "Prescription modifiée";
  description.dispatchEvent(new Event("input", { bubbles: true }));
  description.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
  await expect
    .poll(() => store.capabilities.addOrUpdatePrescription)
    .toHaveBeenCalledWith(expect.objectContaining({ id: "saved-prescription" }));
});

test("shows an import error and allows retrying the same file", async () => {
  const { container } = renderPrescriptions();
  vi.mocked(store.capabilities.addPrescriptionsAndControles!).mockRejectedValue(
    new Error("Serveur indisponible"),
  );
  await chooseFile(container);
  const button = page.getByRole("button", { name: "Importer les prescriptions" });
  await button.click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("L'enregistrement n'a pas pu être confirmé");
  await expect.element(button).toBeEnabled();
  await button.click();
  await expect.poll(() => store.capabilities.addPrescriptionsAndControles).toHaveBeenCalledTimes(2);
});

test("does not import twice when refreshing after a successful save fails", async () => {
  const { container } = renderPrescriptions();
  vi.mocked(refreshDossierFull).mockRejectedValue(new Error("Network error"));
  await chooseFile(container);
  await page.getByRole("button", { name: "Importer les prescriptions" }).click();
  await expect
    .element(page.getByRole("alert"))
    .toHaveTextContent("Les prescriptions ont été importées");
  await expect
    .element(page.getByRole("button", { name: "Importer les prescriptions" }))
    .toBeDisabled();
  expect(store.capabilities.addPrescriptionsAndControles).toHaveBeenCalledTimes(1);
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
