import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";

import DossierPiecesJointes from "./DossierPiecesJointes.svelte";

import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";

afterEach(cleanup);

test("affiche les pièces jointes du projet, des avis et des arrêtés", async () => {
  const ouvrirOnglet = vi.fn();
  const dossier = {
    piècesJointesPétitionnaires: [
      {
        url: "/piece-jointe-petitionnaire/fichier/1",
        nom: "etude-impact.pdf",
        media_type: "application/pdf",
        taille: 2048,
      },
    ],
    avisExpert: [
      {
        expert: "CNPN",
        date_saisine: new Date("2026-01-02"),
        saisine_fichier_url: "/avis/saisine-1",
        saisine_fichier_description: {
          url: "/avis/saisine-1",
          nom: "saisine-cnpn.pdf",
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
  } as unknown as DossierComplet;

  render(DossierPiecesJointes, { dossier, ouvrirOnglet });

  await expect.element(page.getByRole("heading", { name: "Projet" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: /etude-impact\.pdf/ })).toBeVisible();
  await expect.element(page.getByRole("link", { name: /saisine-cnpn\.pdf/ })).toBeVisible();
  await expect.element(page.getByRole("link", { name: /arrete-ap-123\.pdf/ })).toBeVisible();
  await expect.element(page.getByText(/application\/pdf - 1KB - Date de saisine/)).toBeVisible();
  await expect
    .element(page.getByText(/application\/pdf - 4\.1KB - Date de signature/))
    .toBeVisible();
  await expect.element(page.getByText(/Saisine - CNPN - application\/pdf/)).toBeVisible();
  await expect.element(page.getByText(/Arrêté dérogation AP-123 - application\/pdf/)).toBeVisible();
  await expect.element(page.getByRole("heading", { name: "Autres" })).toBeVisible();
  await expect.element(page.getByRole("link", { name: "Télécharger" })).not.toBeInTheDocument();

  await page.getByRole("button", { name: "Voir dans l'onglet Projet" }).click();
  expect(ouvrirOnglet).toHaveBeenCalledWith("projet");

  await page.getByRole("button", { name: "Voir dans l'onglet Avis" }).click();
  expect(ouvrirOnglet).toHaveBeenCalledWith("avis");

  await page.getByRole("button", { name: "Voir dans l'onglet Contrôles" }).click();
  expect(ouvrirOnglet).toHaveBeenCalledWith("controles");
});
