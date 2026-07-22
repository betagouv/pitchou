import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

vi.mock(import("../avisExpert.ts"), () => ({
  addOrUpdateAvisExpert: vi.fn(),
}));

vi.mock(import("$lib/dossier/dossier.ts"), () => ({
  refreshDossierFull: vi.fn(),
}));

import FormAvisExpert from "./FormAvisExpert.svelte";
import { addOrUpdateAvisExpert } from "../avisExpert.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import type { FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 1 as Dossier["id"];

beforeEach(() => {
  vi.mocked(addOrUpdateAvisExpert).mockReset();
  vi.mocked(refreshDossierFull).mockReset();
});

afterEach(cleanup);

test("shows an error alert when saving the avis fails synchronously", async () => {
  const closeForm = vi.fn();
  vi.mocked(addOrUpdateAvisExpert).mockImplementation(() => {
    throw new Error("Network unavailable");
  });

  render(FormAvisExpert, { dossierId: DOSSIER_ID, closeForm });

  await page.getByRole("button", { name: "Sauvegarder" }).click();

  const alert = page.getByRole("alert");
  await expect.element(alert).toBeVisible();
  await expect
    .element(alert)
    .toHaveTextContent("L'enregistrement de l'avis a échoué : Network unavailable");
  expect(refreshDossierFull).not.toHaveBeenCalled();
  expect(closeForm).not.toHaveBeenCalled();
});

test("pressing Enter in an existing avis date confirms the date without saving the form", async () => {
  const closeForm = vi.fn();
  const avisExpertInitial = {
    id: "avis-1",
    dossier: DOSSIER_ID,
    expert: "CNPN",
    saisine_date: new Date("2026-05-01"),
    avis: "Avis favorable",
    avis_date: new Date("2026-05-15"),
    avis_fichier_url: undefined,
    saisine_fichier_url: undefined,
  } as FrontEndAvisExpert;

  render(FormAvisExpert, { dossierId: DOSSIER_ID, closeForm, avisExpertInitial });

  const dateInput = page.getByLabelText("Date avis", { exact: true });
  await dateInput.fill("26/05/2026");
  dateInput.element().focus();
  await userEvent.keyboard("{Enter}");

  await expect.element(dateInput).toHaveValue("26/05/2026");
  expect(addOrUpdateAvisExpert).not.toHaveBeenCalled();
  expect(closeForm).not.toHaveBeenCalled();
});
