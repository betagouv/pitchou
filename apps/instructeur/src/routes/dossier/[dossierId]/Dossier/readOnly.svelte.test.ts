import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";

vi.mock(import("$app/navigation"), () => ({
  afterNavigate: vi.fn(),
  goto: vi.fn(),
  pushState: vi.fn(),
  replaceState: vi.fn(),
}));

vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  sendEvenement: vi.fn(),
}));

// avoid fetching the espèces data files over HTTP from the dossier page
vi.mock(import("$lib/especes/activitesMethodesMoyensDePoursuite.ts"), () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn().mockReturnValue(new Promise(() => {})),
  loadEspecesProtegeesList: vi.fn().mockReturnValue(new Promise(() => {})),
}));

import Dossier from "../Dossier.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { fakeDossier } from "./readOnly.fixtures.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";

function renderDossier(readOnly: boolean, canEdit = true) {
  return render(Dossier, {
    dossier: fakeDossier(),
    activeTab: "instruction",
    onTabChange: vi.fn(),
    email: "instructeur@example.com",
    dossierFollowers: [],
    currentDossierFollowedByCurrentInstructeur: false,
    readOnly,
    onReadOnlyChange: vi.fn(),
    canEdit,
  });
}

/** Every action writing to the dossier, across the header and the tabs. */
const writeActions = [
  "Suivre ce dossier",
  // The label depends on whether the dossier is currently unread.
  /Marquer le dossier comme/,
  "Ajouter un avis ou une saisine",
  "Rajouter une décision administrative",
  "Ajouter une pièce jointe",
  "derogations-especes-protegees.et4.deb.dgaln@developpement-durable.gouv.fr",
];

beforeEach(() => {
  store.capabilities = {
    modifierDossier: vi.fn().mockResolvedValue(undefined),
  } as unknown as PitchouState["capabilities"];
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

test("le mode lecture seule retire toutes les actions d'écriture", async () => {
  renderDossier(true);

  // The instruction tab saves on change: read-only mode must not write at all.
  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();

  for (const action of writeActions) {
    expect(screen.queryByRole("button", { name: action })).toBeNull();
  }

  // The actions menu only holds write actions, so it disappears entirely.
  expect(screen.queryByRole("button", { name: /Plus d’actions/ })).toBeNull();
  expect(screen.queryByLabelText("Laissez un commentaire")).toBeNull();

  // The instruction fields stay visible, but cannot be changed.
  expect(screen.getByRole("combobox", { name: "Phase en cours" })).toBeDisabled();
  expect(screen.getByLabelText("N° de dossier Onagre")).toBeDisabled();

  await expect.element(screen.getByText("Dossier en lecture seule")).toBeVisible();
});

test("seul un utilisateur pouvant éditer peut repasser en mode édition", () => {
  const { unmount } = renderDossier(true, true);
  expect(screen.getByRole("button", { name: "Repasser en mode édition" })).toBeTruthy();
  unmount();

  // Someone the dossier is only shared with sees the notice without a way out.
  renderDossier(true, false);
  expect(screen.getByText("Dossier en lecture seule")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Repasser en mode édition" })).toBeNull();
});

test("le mode lecture seule masque les onglets internes au service", () => {
  renderDossier(true);

  expect(screen.queryByRole("tab", { name: "Historique" })).toBeNull();
  expect(screen.queryByRole("tab", { name: "Générateur de documents" })).toBeNull();

  // The tabs that stay are the ones the dossier is shared through.
  for (const tab of ["Détail du projet", "Instruction", "Avis d’experts", "Contrôle"]) {
    expect(screen.getByRole("tab", { name: tab })).toBeTruthy();
  }
});

test("le mode lecture seule masque les éléments internes au service", () => {
  renderDossier(true);

  // Commentaires are internal to the service.
  expect(screen.queryByRole("heading", { name: "Commentaires" })).toBeNull();

  // Only the official avis is shown, and never its saisine.
  expect(screen.getByRole("heading", { name: /CNPN/ })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: /Autre expert/ })).toBeNull();
  expect(screen.queryByText(/Date d’ajout du courrier de saisine/)).toBeNull();
  expect(screen.queryByText(/Date d’envoi du mail via Pitchou/)).toBeNull();
  expect(screen.queryByText(/Date de lecture de la saisine/)).toBeNull();
  expect(screen.queryByText("3 février 2026")).toBeNull();
  expect(screen.queryByText("4 février 2026")).toBeNull();
  expect(screen.queryByRole("link", { name: /Télécharger le fichier saisine/ })).toBeNull();

  // The décision administrative is shared, its prescriptions are not.
  expect(screen.getByRole("heading", { name: /AP-001/ })).toBeTruthy();
  expect(screen.queryByText(/Prescription secrète/)).toBeNull();
  expect(screen.queryByText(/prescriptions/i)).toBeNull();

  // « Autres » attachments are added by the instructeur and stay internal.
  expect(screen.queryByRole("heading", { name: "Autres" })).toBeNull();
});

test("le mode édition conserve les actions d'écriture", () => {
  renderDossier(false);

  for (const action of writeActions) {
    expect(screen.getByRole("button", { name: action })).toBeTruthy();
  }

  expect(screen.getByRole("button", { name: /Plus d’actions/ })).toBeTruthy();
  expect(screen.getByLabelText("Laissez un commentaire")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Phase en cours" })).not.toBeDisabled();

  // Everything read-only mode hides is available again.
  expect(screen.getByRole("tab", { name: "Historique" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: /Autre expert/ })).toBeTruthy();
  // One per avis: the official one and the « Autre expert » one.
  expect(screen.getAllByText(/Date d’ajout du courrier de saisine/)).toHaveLength(2);
  expect(screen.getAllByText(/Date d’envoi du mail via Pitchou/)).toHaveLength(1);
  expect(screen.getByText("3 février 2026")).toBeTruthy();
  expect(screen.getByText("4 février 2026")).toBeTruthy();
  expect(screen.queryByText("10 février 2026")).toBeNull();
  expect(screen.queryByText("11 février 2026")).toBeNull();
  expect(screen.getByRole("heading", { name: "Autres" })).toBeTruthy();

  expect(screen.queryByText("Dossier en lecture seule")).toBeNull();
});
