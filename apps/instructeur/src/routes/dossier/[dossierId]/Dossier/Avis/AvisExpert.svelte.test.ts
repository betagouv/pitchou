import "@gouvfr/dsfr/dist/dsfr.min.css";
import "../../../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import AvisExpert from "./AvisExpert.svelte";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";
import type { DossierCnpnEmailSentEvent, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import { store } from "$lib/state/store.svelte.ts";

vi.mock("$lib/dossier/dossier.ts", () => ({
  recordLocalWrite: vi.fn(),
  refreshDossierFull: vi.fn().mockResolvedValue(undefined),
}));

const DOSSIER_ID = 1 as Dossier["id"];

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

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
  const cnpnEmailEvent = {
    sent_at: new Date("2026-08-02"),
    opened_at: null,
  } as DossierCnpnEmailSentEvent;

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
});

test.each(["saisine", "avis"] as const)(
  "deletes only the %s file after confirmation",
  async (type) => {
    const deletePieceJointe = vi.fn().mockResolvedValue(undefined);
    store.capabilities = { deletePieceJointe };
    const deleteAvisExpert = vi.fn();
    const avisExpert = reactive({
      id: "expert-1",
      dossier: DOSSIER_ID,
      expert: "CNPN",
      avis: "Avis favorable",
      saisine_date: new Date("2026-08-01"),
      avis_date: new Date("2026-08-02"),
      saisine_fichier_url: "/saisine.pdf",
      saisine_fichier_description: { id: "shared-file", name: "saisine.pdf" },
      avis_fichier_url: "/avis.pdf",
      avis_fichier_description: { id: "shared-file", name: "avis.pdf" },
    } as unknown as FrontEndAvisExpert);
    render(AvisExpert, { dossierId: DOSSIER_ID, avisExpert, deleteAvisExpert });
    await page.getByRole("button", { name: `Supprimer ${type}.pdf` }).click();
    await expect
      .element(page.getByRole("dialog", { name: `Voulez-vous supprimer ${type}.pdf ?` }))
      .toBeVisible();
    expect(deletePieceJointe).not.toHaveBeenCalled();
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    expect(deletePieceJointe).not.toHaveBeenCalled();
    await page.getByRole("button", { name: `Supprimer ${type}.pdf` }).click();
    await page.getByRole("button", { name: "Confirmer la suppression" }).click();
    await expect
      .element(page.getByRole("button", { name: `Supprimer ${type}.pdf` }))
      .not.toBeInTheDocument();
    expect(deletePieceJointe).toHaveBeenCalledWith({
      dossier: DOSSIER_ID,
      type,
      entityId: "expert-1",
      fileId: "shared-file",
    });
    const otherType = type === "saisine" ? "avis" : "saisine";
    await expect
      .element(page.getByRole("button", { name: `Supprimer ${otherType}.pdf` }))
      .toBeVisible();
    await expect
      .element(page.getByRole("heading", { name: "CNPN - Avis favorable" }))
      .toBeVisible();
    expect(deleteAvisExpert).not.toHaveBeenCalled();
  },
);
