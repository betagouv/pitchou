import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import { format } from "date-fns";
import { tick } from "svelte";
import {
  chooseFichiers,
  DOSSIER_ID,
  dossier,
  expectTracking,
  fillTypeAutre,
  setupDsfrModalMock,
} from "./ouvrirModaleAjouterPieceJointe.testHelpers.ts";

vi.mock(import("$app/navigation"), () => ({
  afterNavigate: vi.fn(),
  goto: vi.fn(),
}));

vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  sendEvenement: vi.fn(),
}));

vi.mock(import("$lib/dossier/dossier.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  refreshDossierFull: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(import("./otherAttachment.ts"), () => ({
  addOtherAttachment: vi.fn().mockResolvedValue(["attachment-1", "attachment-2"]),
}));

import { sendEvenement } from "$lib/shared/aarri.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import { addOtherAttachment } from "./otherAttachment.ts";
import DossierAvis from "./DossierAvis.svelte";
import DossierControles from "./DossierControles.svelte";
import DossierPiecesJointes from "./DossierPiecesJointes.svelte";
import HeaderDossier from "./HeaderDossier.svelte";
import ModalAddPieceJointe from "./ModalAddPieceJointe.svelte";

beforeEach(() => {
  vi.mocked(sendEvenement).mockReset();
  vi.mocked(addOtherAttachment).mockClear();
  vi.mocked(refreshDossierFull).mockClear();
  setupDsfrModalMock();
});

afterEach(cleanup);

test("trace l'ouverture de la modale depuis l'entête du dossier", async () => {
  render(HeaderDossier, {
    dossier: dossier(),
    email: "instructeur@example.com",
    currentDossierFollowedByCurrentInstructeur: false,
    dossierFollowers: [],
    onSetRead: vi.fn(),
    onEnterReadOnly: vi.fn(),
  });

  // The entry point now lives in the "…" actions menu.
  await page.getByRole("button", { name: /Plus d’actions/ }).click();
  await page.getByRole("menuitem", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("enteteDossier");
});

test("trace l'ouverture de la modale depuis l'onglet pièces jointes", async () => {
  render(DossierPiecesJointes, { dossier: dossier(), openTab: vi.fn() });

  await page.getByRole("button", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("ongletPiecesJointes");
});

test("trace l'ouverture de la modale depuis l'onglet avis", async () => {
  render(DossierAvis, {
    dossier: dossier(),
    email: "instructeur@example.com",
    followers: [],
  });

  await page.getByRole("button", { name: "Ajouter un avis ou une saisine" }).click();

  expectTracking("ongletAvis");
});

test("trace l'ouverture de la modale depuis l'onglet contrôles", async () => {
  render(DossierControles, { dossier: dossier() });

  await page.getByRole("button", { name: "Rajouter une décision administrative" }).click();

  expectTracking("ongletControles");
});

test("trace l'ajout réussi d'une pièce jointe autre avec la source et le nombre de fichiers", async () => {
  const { container } = render(ModalAddPieceJointe, {
    id: "modale-test-ajout-autre",
    dossier: dossier(),
    typesPiecesJointes: ["Autre"],
    typePieceJointeInitial: "Autre",
    showTypeChoice: false,
    source: "enteteDossier",
  });

  await chooseFichiers(container, [
    new File(["contenu 1"], "note-1.pdf", { type: "application/pdf" }),
    new File(["contenu 2"], "note-2.pdf", { type: "application/pdf" }),
  ]);
  await fillTypeAutre(container, "Note interne");

  await waitFor(() => {
    const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Valider"),
    );
    expect(submitButton).toBeTruthy();
  });
  const submitButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Valider"),
  );
  if (!submitButton) throw new Error("bouton Valider introuvable");
  submitButton.click();

  await waitFor(() => expect(addOtherAttachment).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(sendEvenement).toHaveBeenCalledWith({
      type: "ajouterPieceJointe",
      details: {
        dossierId: DOSSIER_ID,
        source: "enteteDossier",
        typePieceJointe: "Autre",
        nombreFichiers: 2,
      },
    }),
  );
});

test("affiche des libellés experts détaillés pour la saisine et l'avis", async () => {
  const { container } = render(ModalAddPieceJointe, {
    id: "modale-test-libelles",
    dossier: dossier(),
    typesPiecesJointes: ["Saisine expert", "Avis expert", "Décision administrative", "Autre"],
    source: "ongletPiecesJointes",
  });

  const libelles = Array.from(container.querySelectorAll("label")).map((label) =>
    label.textContent?.trim(),
  );

  expect(libelles).toContain("Saisine CNPN / CSRPN");
  expect(libelles).toContain("Avis (CNPN, CSRPN, CBN, PNA, etc.)");
  // The generic labels are no longer displayed as-is.
  expect(libelles).not.toContain("Saisine expert");
  expect(libelles).not.toContain("Avis expert");
});

test("sélectionne la date du jour pour chaque type de pièce jointe", async () => {
  const { container } = render(ModalAddPieceJointe, {
    id: "modale-test-dates",
    dossier: dossier(),
    typesPiecesJointes: ["Saisine expert", "Avis expert", "Décision administrative", "Autre"],
    source: "ongletPiecesJointes",
  });

  const today = format(new Date(), "dd/MM/yyyy");
  const selectType = async (type: string) => {
    const input = container.querySelector<HTMLInputElement>(`input[type="radio"][value="${type}"]`);
    if (!input) throw new Error(`type de pièce jointe ${type} introuvable`);
    input.click();
    await tick();
  };

  await selectType("Saisine expert");
  expect(
    container.querySelector<HTMLInputElement>("#modale-date-saisine-modale-test-dates")?.value,
  ).toBe(today);

  await selectType("Avis expert");
  expect(
    container.querySelector<HTMLInputElement>("#modale-date-avis-modale-test-dates")?.value,
  ).toBe(today);

  await selectType("Autre");
  expect(
    container.querySelector<HTMLInputElement>("#other-attachment-date-modale-test-dates")?.value,
  ).toBe(today);

  await selectType("Décision administrative");
  expect(container.querySelector<HTMLInputElement>("#input-date-signature")?.value).toBe(today);
  expect(container.querySelector<HTMLInputElement>("#input-date-fin-obligations")?.value).toBe("");
});
