import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import DossierPiecesJointes from "./DossierPiecesJointes.svelte";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

afterEach(cleanup);

test("affiche les pièces jointes du projet, des avis et des arrêtés", async () => {
  const openTab = vi.fn();
  const dossier = {
    id: "dossier-1",
    piècesJointesPétitionnaires: [
      {
        url: "/piece-jointe-petitionnaire/fichier/1",
        nom: "etude-impact.pdf",
        media_type: "application/pdf",
        taille: 2048,
        DS_createdAt: new Date("2026-01-01"),
      },
    ],
    avisExpert: [
      {
        expert: "CNPN",
        date_saisine: new Date("2026-01-02"),
        saisine_fichier_url: "/avis/saisine-1",
        saisine_fichier_description: {
          url: "/avis/saisine-1",
          nom: "saisine-csrpn-pistes-cyclables-rennes-metropole.pdf",
          media_type: "application/pdf",
          taille: 1024,
        },
      },
    ],
    décisionsAdministratives: [
      {
        type: "Arrêté dérogation",
        numéro: "AP-123",
        date_signature: new Date("2026-02-03"),
        fichier_url: "/decision-administrative/fichier/1",
        fichier_description: {
          url: "/decision-administrative/fichier/1",
          nom: "arrete-ap-123.pdf",
          media_type: "application/pdf",
          taille: 4096,
        },
      },
    ],
    attachmentAutres: [
      {
        type: "Note interne",
        attachment_date: new Date("2026-03-04"),
        fichier_url: "/attachment-autre/fichier/1",
        fichier_description: {
          url: "/attachment-autre/fichier/1",
          nom: "note-interne.pdf",
          media_type: "application/pdf",
          taille: 512,
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

  await page.getByRole("button", { name: "Voir dans l'onglet Projet" }).click();
  expect(openTab).toHaveBeenCalledWith("projet");

  await page.getByRole("button", { name: "Voir dans l'onglet Avis" }).click();
  expect(openTab).toHaveBeenCalledWith("avis");

  await page.getByRole("button", { name: "Voir dans l'onglet Contrôles" }).click();
  expect(openTab).toHaveBeenCalledWith("controles");

  await page.getByRole("button", { name: "Voir dans l'onglet Instruction" }).click();
  expect(openTab).toHaveBeenCalledWith("instruction");
});
