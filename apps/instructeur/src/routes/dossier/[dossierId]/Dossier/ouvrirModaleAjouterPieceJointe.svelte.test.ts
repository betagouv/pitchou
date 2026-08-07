import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import { format } from "date-fns";
import { tick } from "svelte";

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

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const DOSSIER_ID = 123;

beforeEach(() => {
  vi.mocked(sendEvenement).mockReset();
  vi.mocked(addOtherAttachment).mockClear();
  vi.mocked(refreshDossierFull).mockClear();
  Object.assign(window, {
    dsfr: vi.fn(() => ({ modal: { conceal: vi.fn() } })),
  });
});

afterEach(cleanup);

function dossier(overrides: Partial<DossierFull> = {}): DossierFull {
  return {
    id: DOSSIER_ID,
    name: "Dossier test",
    communes: null,
    departments: ["01"],
    regions: null,
    main_activite: "Travaux",
    demarche_numerique_number: 456,
    demandeur_personne_morale_siret: null,
    demandeur_personne_morale_legal_name: "",
    representative_email: null,
    demandeur_personne_physique_last_name: "Durand",
    demandeur_personne_physique_first_names: "Alice",
    demandeur_personne_physique_email: null,
    deposant_last_name: "Durand",
    deposant_first_names: "Alice",
    deposant_email: null,
    next_action_expected_from: null,
    enjeu: false,
    linked_to_ae_regime: false,
    evenementsPhase: [],
    avisExpert: [],
    decisionsAdministratives: [],
    piecesJointesPetitionnaires: [],
    otherAttachments: [],
    ...overrides,
  } as unknown as DossierFull;
}

function expectTracking(source: string) {
  expect(sendEvenement).toHaveBeenCalledWith({
    type: "ouvrirModaleAjouterPieceJointe",
    details: { dossierId: DOSSIER_ID, source },
  });
}

async function chooseFichiers(container: HTMLElement, fichiers: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("input fichier introuvable");

  const dataTransfer = new DataTransfer();
  for (const fichier of fichiers) {
    dataTransfer.items.add(fichier);
  }
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

async function fillTypeAutre(container: HTMLElement, type: string) {
  const input = container.querySelector<HTMLInputElement>('input[id^="other-attachment-type-"]');
  if (!input) throw new Error("input type autre introuvable");

  input.value = type;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

test("trace l'ouverture de la modale depuis l'entête du dossier", async () => {
  render(HeaderDossier, {
    dossier: dossier(),
    email: "instructeur@example.com",
    currentDossierFollowedByCurrentInstructeur: false,
  });

  await page.getByRole("button", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("enteteDossier");
});

test("trace l'ouverture de la modale depuis l'onglet pièces jointes", async () => {
  render(DossierPiecesJointes, { dossier: dossier(), openTab: vi.fn() });

  await page.getByRole("button", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("ongletPiecesJointes");
});

test("trace l'ouverture de la modale depuis l'onglet avis", async () => {
  render(DossierAvis, { dossier: dossier() });

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
