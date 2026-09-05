import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import AvisExpert from "./AvisExpert.svelte";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { DossierCnpnEmailSentEvent, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
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

test("affiche les dates du mail associé à la saisine CNPN", async () => {
  const avisExpert = reactive({
    id: "avis-expert-1",
    dossier: DOSSIER_ID,
    expert: "CNPN",
    saisine_date: new Date("2026-08-01"),
    saisine_fichier_description: { created_at: new Date("2026-08-03") },
  } as unknown as FrontEndAvisExpert);
  const cnpnEmailEvent = reactive({
    sent_at: new Date("2026-08-02"),
    opened_at: null,
  } as DossierCnpnEmailSentEvent);

  render(AvisExpert, {
    dossierId: DOSSIER_ID,
    avisExpert,
    cnpnEmailEvent,
    deleteAvisExpert: vi.fn(),
  });

  await expect.element(page.getByText(/Date d’ajout du courrier de saisine/)).toBeVisible();
  await expect.element(page.getByText("3 août 2026")).toBeVisible();
  await expect.element(page.getByText(/Date d’envoi du mail via Pitchou/)).toBeVisible();
  await expect.element(page.getByText("2 août 2026")).toBeVisible();
  await expect.element(page.getByText(/Date de lecture de la saisine/)).toBeVisible();
  await expect.element(page.getByText("Pas encore lue")).toBeVisible();

  cnpnEmailEvent.opened_at = "2026-08-04T10:30:00Z";

  await expect.element(page.getByText("4 août 2026")).toBeVisible();
  await expect.element(page.getByText("Pas encore lue")).not.toBeInTheDocument();
});

test("shows pending CNPN tracking when no email matches the saisine", async () => {
  render(AvisExpert, {
    dossierId: DOSSIER_ID,
    avisExpert: {
      id: "avis-expert-1",
      dossier: DOSSIER_ID,
      expert: "CNPN",
      saisine_date: new Date("2026-08-01"),
    } as unknown as FrontEndAvisExpert,
    deleteAvisExpert: vi.fn(),
  });

  await expect.element(page.getByText("1 août 2026")).toBeVisible();
  await expect.element(page.getByText("Pas encore envoyé")).toBeVisible();
  await expect.element(page.getByText("Pas encore lue")).toBeVisible();
});
