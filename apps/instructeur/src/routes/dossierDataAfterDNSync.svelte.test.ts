import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";

vi.mock(import("$app/navigation"), () => ({
  afterNavigate: vi.fn(),
  goto: vi.fn(),
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

import { store } from "$lib/state/store.svelte.ts";
import { getDossierFull } from "$lib/dossier/dossier.ts";
import PageTousLesDossiers from "./tous-les-dossiers/+page.svelte";
import PageDossier from "./dossier/[dossierId]/+page.svelte";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the instructeur already visited the dossier (so it is cached in
// store.fullDossiers), then a synchronization with DN changed the dossier
// server-side. Both pages must display the up-to-date data.
// The nom is used here as the observable field, but the same applies to any
// data changed by the synchronization.

const DOSSIER_ID = 123 as DossierId;
const NOM_BEFORE_SYNC = "Nom avant synchronisation";
const NOM_AFTER_SYNC = "Nom après synchronisation";

function fakeDossierFull(nom: string): DossierFull {
  return {
    id: DOSSIER_ID,
    name: nom,
    communes: null,
    departments: ["01"],
    regions: null,
    main_activite: "Travaux",
    demarche_numerique_number: "456",
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
    onagre_demande_identifier: null,
    free_comment: "",
    ddep_required: null,
    er_mesures_sufficient: null,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
    depot_date: new Date("2026-01-15"),
    evenementsPhase: [],
    avisExpert: [],
    decisionsAdministratives: [],
    piecesJointesPetitionnaires: [],
    otherAttachments: [],
  } as unknown as DossierFull;
}

// As returned by the /dossiers route: dates are serialized strings
function fakeDossierSummary(nom: string): DossierSummary {
  return {
    id: DOSSIER_ID,
    name: nom,
    demarche_numerique_number: "456",
    main_activite: "Travaux",
    linked_to_ae_regime: false,
    onagre_demande_identifier: null,
    communes: null,
    departments: ["01"],
    regions: null,
    deposant_last_name: "Durand",
    deposant_first_names: "Alice",
    demandeur_personne_physique_last_name: "Durand",
    demandeur_personne_physique_first_names: "Alice",
    demandeur_personne_morale_legal_name: null,
    demandeur_personne_morale_siret: null,
    phase: "Accompagnement amont",
    next_action_expected_from: null,
    depot_date: "2026-01-15",
    phase_start_date: "2026-01-15",
    enjeu: false,
    free_comment: "",
  } as unknown as DossierSummary;
}

afterEach(() => {
  cleanup();
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
  store.identité = undefined;
});

test("after a DN synchronization, the tous-les-dossiers page displays the up-to-date dossier", async () => {
  // the dossier was visited before the synchronization
  store.fullDossiers.set(DOSSIER_ID, fakeDossierFull(NOM_BEFORE_SYNC));
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    listerDossiers: vi.fn().mockResolvedValue([fakeDossierSummary(NOM_AFTER_SYNC)]),
  } as unknown as PitchouState["capabilities"];

  render(PageTousLesDossiers);

  await waitFor(() => {
    expect(screen.getByText(NOM_AFTER_SYNC)).toBeTruthy();
  });
  expect(screen.queryByText(NOM_BEFORE_SYNC)).toBeNull();
});

test("after a DN synchronization, the page of an already visited dossier also displays the up-to-date dossier", async () => {
  // the dossier was visited before the synchronization
  store.fullDossiers.set(DOSSIER_ID, fakeDossierFull(NOM_BEFORE_SYNC));
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];

  // the server now responds with the synchronized dossier, but not instantly
  let respondToRefresh: ((dossier: DossierFull) => void) | undefined;
  store.capabilities = {
    recupérerDossierComplet: vi.fn().mockReturnValue(
      new Promise<DossierFull>((resolve) => {
        respondToRefresh = resolve;
      }),
    ),
    modifierDossier: vi.fn().mockResolvedValue(undefined),
  } as unknown as PitchouState["capabilities"];

  // same call as the load of the dossier/[dossierId] route
  await getDossierFull(DOSSIER_ID);
  render(PageDossier, {
    data: { dossierId: DOSSIER_ID },
    params: { dossierId: String(DOSSIER_ID) },
  });

  // the cached version is displayed immediately, without waiting for the server
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(NOM_BEFORE_SYNC);

  // the server response arrives: the up-to-date dossier must replace the cached one
  respondToRefresh?.(fakeDossierFull(NOM_AFTER_SYNC));
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(NOM_AFTER_SYNC);
  });
});
