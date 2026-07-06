import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock(import("$app/navigation"), () => ({
  afterNavigate: vi.fn(),
  goto: vi.fn(),
}));

vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  envoyerÉvènement: vi.fn(),
}));

vi.mock(import("$lib/dossier/dossier.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  refreshDossierComplet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(import("./attachmentAutre.ts"), () => ({
  addAttachmentAutre: vi.fn().mockResolvedValue(["attachment-1", "attachment-2"]),
}));

import { envoyerÉvènement } from "$lib/shared/aarri.ts";
import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
import { addAttachmentAutre } from "./attachmentAutre.ts";
import DossierAvis from "./DossierAvis.svelte";
import DossierContrôles from "./DossierContrôles.svelte";
import DossierPiecesJointes from "./DossierPiecesJointes.svelte";
import EnteteDossier from "./EnteteDossier.svelte";
import ModaleAjouterPièceJointe from "./ModaleAjouterPièceJointe.svelte";

import type { DossierComplet } from "@pitchou/types/API_Pitchou.ts";

const DOSSIER_ID = 123;

beforeEach(() => {
  vi.mocked(envoyerÉvènement).mockReset();
  vi.mocked(addAttachmentAutre).mockClear();
  vi.mocked(refreshDossierComplet).mockClear();
  Object.assign(window, {
    dsfr: vi.fn(() => ({ modal: { conceal: vi.fn() } })),
  });
});

afterEach(cleanup);

function dossier(overrides: Partial<DossierComplet> = {}): DossierComplet {
  return {
    id: DOSSIER_ID,
    nom: "Dossier test",
    communes: null,
    départements: ["01"],
    régions: null,
    activité_principale: "Travaux",
    number_demarches_simplifiées: 456,
    demandeur_personne_morale_siret: null,
    demandeur_personne_morale_raison_sociale: "",
    representative_email: null,
    demandeur_personne_physique_nom: "Durand",
    demandeur_personne_physique_prénoms: "Alice",
    demandeur_personne_physique_email: null,
    déposant_nom: "Durand",
    déposant_prénoms: "Alice",
    déposant_email: null,
    prochaine_action_attendue_par: null,
    enjeu: false,
    rattaché_au_régime_ae: false,
    évènementsPhase: [],
    avisExpert: [],
    décisionsAdministratives: [],
    piècesJointesPétitionnaires: [],
    attachmentAutres: [],
    ...overrides,
  } as unknown as DossierComplet;
}

function expectTracking(source: string) {
  expect(envoyerÉvènement).toHaveBeenCalledWith({
    type: "ouvrirModaleAjouterPieceJointe",
    détails: { dossierId: DOSSIER_ID, source },
  });
}

async function choisirFichiers(container: HTMLElement, fichiers: File[]) {
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

async function renseignerTypeAutre(container: HTMLElement, type: string) {
  const input = container.querySelector<HTMLInputElement>('input[id^="other-attachment-type-"]');
  if (!input) throw new Error("input type autre introuvable");

  input.value = type;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
}

test("trace l'ouverture de la modale depuis l'entête du dossier", async () => {
  render(EnteteDossier, {
    dossier: dossier(),
    email: "instructeur@example.com",
    dossierActuelSuiviParInstructeurActuel: false,
  });

  await page.getByRole("button", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("enteteDossier");
});

test("trace l'ouverture de la modale depuis l'onglet pièces jointes", async () => {
  render(DossierPiecesJointes, { dossier: dossier(), ouvrirOnglet: vi.fn() });

  await page.getByRole("button", { name: "Ajouter une pièce jointe" }).click();

  expectTracking("ongletPiecesJointes");
});

test("trace l'ouverture de la modale depuis l'onglet avis", async () => {
  render(DossierAvis, { dossier: dossier() });

  await page.getByRole("button", { name: "Ajouter un avis ou une saisine" }).click();

  expectTracking("ongletAvis");
});

test("trace l'ouverture de la modale depuis l'onglet contrôles", async () => {
  render(DossierContrôles, { dossier: dossier() });

  await page.getByRole("button", { name: "Rajouter une décision administrative" }).click();

  expectTracking("ongletControles");
});

test("trace l'ajout réussi d'une pièce jointe autre avec la source et le nombre de fichiers", async () => {
  const { container } = render(ModaleAjouterPièceJointe, {
    id: "modale-test-ajout-autre",
    dossier: dossier(),
    typesPiècesJointes: ["Autre"],
    typePièceJointeInitial: "Autre",
    afficherChoixType: false,
    source: "enteteDossier",
  });

  await choisirFichiers(container, [
    new File(["contenu 1"], "note-1.pdf", { type: "application/pdf" }),
    new File(["contenu 2"], "note-2.pdf", { type: "application/pdf" }),
  ]);
  await renseignerTypeAutre(container, "Note interne");

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

  await waitFor(() => expect(addAttachmentAutre).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(envoyerÉvènement).toHaveBeenCalledWith({
      type: "ajouterPieceJointe",
      détails: {
        dossierId: DOSSIER_ID,
        source: "enteteDossier",
        typePieceJointe: "Autre",
        nombreFichiers: 2,
      },
    }),
  );
});
