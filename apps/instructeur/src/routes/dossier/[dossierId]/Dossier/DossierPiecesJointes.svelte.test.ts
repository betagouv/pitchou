import "@gouvfr/dsfr/dist/dsfr.min.css";
import "../../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import DossierPiecesJointes from "./DossierPiecesJointes.svelte";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import { store } from "$lib/state/store.svelte.ts";

vi.mock("$lib/dossier/dossier.ts", () => ({
  recordLocalWrite: vi.fn(),
  refreshDossierFull: vi.fn().mockResolvedValue(undefined),
}));

afterEach(cleanup);

test("affiche les pièces jointes du projet, des avis et des arrêtés", async () => {
  const openTab = vi.fn();
  const dossier = {
    id: "dossier-1",
    piecesJointesPetitionnaires: [
      {
        url: "/piece-jointe-petitionnaire/fichier/1",
        name: "etude-impact.pdf",
        media_type: "application/pdf",
        size: 2048,
        demarche_numerique_created_at: new Date("2026-01-01"),
      },
    ],
    avisExpert: [
      {
        expert: "CNPN",
        saisine_date: new Date("2026-01-02"),
        saisine_fichier_url: "/avis/saisine-1",
        saisine_fichier_description: {
          url: "/avis/saisine-1",
          name: "saisine-csrpn-pistes-cyclables-rennes-metropole.pdf",
          media_type: "application/pdf",
          size: 1024,
        },
      },
    ],
    decisionsAdministratives: [
      {
        type: "Arrêté dérogation",
        number: "AP-123",
        signature_date: new Date("2026-02-03"),
        fichier_url: "/decision-administrative/fichier/1",
        fichier_description: {
          url: "/decision-administrative/fichier/1",
          name: "arrete-ap-123.pdf",
          media_type: "application/pdf",
          size: 4096,
        },
      },
    ],
    otherAttachments: [
      {
        type: "Note interne",
        attachment_date: new Date("2026-03-04"),
        fichier_url: "/attachment-autre/fichier/1",
        fichier_description: {
          url: "/attachment-autre/fichier/1",
          name: "note-interne.pdf",
          media_type: "application/pdf",
          size: 512,
        },
      },
    ],
  } as unknown as DossierFull;

  render(DossierPiecesJointes, { dossier, openTab });

  await expect
    .element(page.getByRole("button", { name: "Ajouter une pièce jointe" }))
    .toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Projet" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: /etude-impact\.pdf/ })).toBeVisible();
  await expect.element(page.getByText(/Date de dépôt : 1 janvier 2026/)).toBeVisible();
  await expect
    .element(
      page.getByRole("link", {
        name: /saisine-csrpn-pistes-cyclables-rennes-metropole\.pdf/,
      }),
    )
    .toBeVisible();
  await expect.element(page.getByText(/\(\.\.\.\)/)).not.toBeInTheDocument();
  await expect.element(page.getByRole("link", { name: /arrete-ap-123\.pdf/ })).toBeVisible();
  await expect.element(page.getByRole("link", { name: /note-interne\.pdf/ })).toBeVisible();
  await expect.element(page.getByText(/application\/pdf - 1KB - Date de saisine/)).toBeVisible();
  await expect
    .element(page.getByText(/application\/pdf - 4\.1KB - Date de signature/))
    .toBeVisible();
  await expect.element(page.getByText(/Note interne - application\/pdf/)).toBeVisible();
  await expect.element(page.getByText(/Saisine - CNPN - application\/pdf/)).toBeVisible();
  await expect.element(page.getByText(/Arrêté dérogation AP-123 - application\/pdf/)).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Autres" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Télécharger" })).not.toBeInTheDocument();

  await page.getByRole("button", { name: "Voir dans l'onglet Détail du projet" }).click();
  expect(openTab).toHaveBeenCalledWith("detail-du-projet");

  await page.getByRole("button", { name: "Voir dans l'onglet Avis" }).click();
  expect(openTab).toHaveBeenCalledWith("avis");

  await page.getByRole("button", { name: "Voir dans l'onglet Contrôles" }).click();
  expect(openTab).toHaveBeenCalledWith("controles");

  await expect
    .element(page.getByRole("button", { name: "Voir dans l'onglet Instruction" }))
    .not.toBeInTheDocument();
  expect(openTab).toHaveBeenCalledTimes(3);
});

test("confirms attachment deletion, preserves it on cancellation or error, and protects project files", async () => {
  const deletePieceJointe = vi
    .fn()
    .mockRejectedValueOnce(new Error("Suppression refusée"))
    .mockResolvedValue(undefined);
  store.capabilities = { deletePieceJointe };
  const dossier = {
    id: 42,
    piecesJointesPetitionnaires: [{ id: "project-file", url: "/project.pdf", name: "projet.pdf" }],
    avisExpert: [],
    decisionsAdministratives: [],
    otherAttachments: [
      {
        id: "attachment",
        fichier: "file",
        type: "Note",
        fichier_url: "/note.pdf",
        fichier_description: { name: "note.pdf" },
      },
    ],
  } as unknown as DossierFull;
  render(DossierPiecesJointes, { dossier, openTab: vi.fn() });
  await expect
    .element(page.getByRole("button", { name: "Supprimer projet.pdf" }))
    .not.toBeInTheDocument();
  await page.getByRole("button", { name: "Supprimer note.pdf" }).click();
  await expect
    .element(page.getByRole("dialog", { name: "Voulez-vous supprimer note.pdf ?" }))
    .toBeVisible();
  expect(deletePieceJointe).not.toHaveBeenCalled();
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect.element(page.getByRole("link", { name: /note.pdf/ })).toBeVisible();
  await page.getByRole("button", { name: "Supprimer note.pdf" }).click();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect.element(page.getByRole("alert")).toHaveTextContent("Suppression refusée");
  await expect.element(page.getByRole("link", { name: /note.pdf/ })).toBeVisible();
  await page.getByRole("button", { name: "Confirmer la suppression" }).click();
  await expect.element(page.getByRole("link", { name: /note.pdf/ })).not.toBeInTheDocument();
  expect(deletePieceJointe).toHaveBeenLastCalledWith({
    dossier: 42,
    type: "autre",
    entityId: "attachment",
    fileId: "file",
  });
  await expect.element(page.getByRole("link", { name: /projet.pdf/ })).toBeVisible();
  store.capabilities = {};
});
