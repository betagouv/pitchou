import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
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
