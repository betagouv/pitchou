import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import { createOdsFile } from "@odfjs/odfjs";
import { tick } from "svelte";
import PrescriptionImport from "./PrescriptionImport.svelte";
import { store } from "$lib/state/store.svelte.ts";
import type { FrontEndDecisionAdministrative } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

vi.mock(import("$lib/dossier/dossier.ts"), () => ({ refreshDossierFull: vi.fn() }));
import { refreshDossierFull } from "$lib/dossier/dossier.ts";

afterEach(() => {
  cleanup();
  store.capabilities = {};
  vi.resetAllMocks();
});

async function selectSurface(container: HTMLElement, value: string) {
  const buffer = await createOdsFile(
    new Map([
      [
        "Prescriptions",
        [[{ type: "string", value: "Surface compensée" }], [{ type: "string", value }]],
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

function setup() {
  store.capabilities.addPrescriptionsAndControles = vi.fn().mockResolvedValue(undefined);
  const onimport = vi.fn();
  const { container } = render(PrescriptionImport, {
    dossierId: 1 as Dossier["id"],
    decisionAdministrative: {
      id: "decision-1",
      number: "AP-001",
    } as FrontEndDecisionAdministrative,
    onimport,
  });
  return { container, onimport };
}

test("shows the conversion and saves only after explicit acceptance", async () => {
  const { container, onimport } = setup();
  vi.mocked(refreshDossierFull).mockResolvedValue({
    decisionsAdministratives: [
      {
        id: "decision-1",
        prescriptions: [{ id: "saved", compensated_surface: 24000 }],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof refreshDossierFull>>);
  await selectSurface(container, "2,4 ha");
  await page.getByRole("button", { name: "Importer les prescriptions", exact: true }).click();
  const accept = page.getByRole("button", { name: "Accepter les conversions et importer" });
  await expect.element(accept).toBeVisible();
  await expect.element(page.getByRole("status")).toHaveTextContent(/2,4 ha.*24\s000 m²/u);
  expect(store.capabilities.addPrescriptionsAndControles).not.toHaveBeenCalled();
  await accept.click();
  await expect.poll(() => onimport).toHaveBeenCalledTimes(1);
  expect(store.capabilities.addPrescriptionsAndControles).toHaveBeenCalledWith([
    expect.objectContaining({ compensated_surface: 24000 }),
  ]);
});

test("removing a file dismisses its conversion proposal without saving", async () => {
  const { container } = setup();
  await selectSurface(container, "2,4 ha");
  await page.getByRole("button", { name: "Importer les prescriptions", exact: true }).click();
  await expect
    .element(page.getByRole("button", { name: "Accepter les conversions et importer" }))
    .toBeVisible();
  await page.getByRole("button", { name: "Retirer prescriptions.ods" }).click();
  await expect
    .element(page.getByRole("button", { name: "Importer les prescriptions", exact: true }))
    .toBeDisabled();
  expect(store.capabilities.addPrescriptionsAndControles).not.toHaveBeenCalled();
  await selectSurface(container, "3 ha");
  await page.getByRole("button", { name: "Importer les prescriptions", exact: true }).click();
  await expect.element(page.getByRole("status")).toHaveTextContent(/3 ha.*30\s000 m²/u);
  expect(store.capabilities.addPrescriptionsAndControles).not.toHaveBeenCalled();
});
