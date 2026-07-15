import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";

vi.mock(import("$app/navigation"), () => ({
  afterNavigate: vi.fn(),
  goto: vi.fn(),
}));

vi.mock(import("$lib/shared/aarri.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  envoyerÉvènement: vi.fn(),
}));

// avoid fetching the espèces data files over HTTP from the dossier page
vi.mock(import("$lib/especes/activitésMéthodesMoyensDePoursuite.ts"), () => ({
  chargerActivitésMéthodesMoyensDePoursuite: vi.fn().mockReturnValue(new Promise(() => {})),
  chargerListeEspècesProtégées: vi.fn().mockReturnValue(new Promise(() => {})),
}));

import { store } from "$lib/state/store.svelte.ts";
import { getDossierComplet } from "$lib/dossier/dossier.ts";
import PageTousLesDossiers from "./tous-les-dossiers/+page.svelte";
import PageDossier from "./dossier/[dossierId]/+page.svelte";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierComplet, DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the instructeur already visited the dossier (so it is cached in
// store.dossiersComplets), then a synchronization with DN changed the dossier
// server-side. Both pages must display the up-to-date data.
// The nom is used here as the observable field, but the same applies to any
// data changed by the synchronization.

const DOSSIER_ID = 123 as DossierId;
const NOM_BEFORE_SYNC = "Nom avant synchronisation";
const NOM_AFTER_SYNC = "Nom après synchronisation";

function fakeDossierComplet(nom: string): DossierComplet {
  return {
    id: DOSSIER_ID,
    nom,
    communes: null,
    départements: ["01"],
    régions: null,
    activité_principale: "Travaux",
    number_demarches_simplifiées: "456",
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
    historique_identifiant_demande_onagre: null,
    commentaire_libre: "",
    ddep_nécessaire: null,
    mesures_er_suffisantes: null,
    date_debut_consultation_public: null,
    date_fin_consultation_public: null,
    date_dépôt: new Date("2026-01-15"),
    évènementsPhase: [],
    avisExpert: [],
    décisionsAdministratives: [],
    piècesJointesPétitionnaires: [],
    attachmentAutres: [],
  } as unknown as DossierComplet;
}

// As returned by the /dossiers route: dates are serialized strings
function fakeDossierResume(nom: string): DossierRésumé {
  return {
    id: DOSSIER_ID,
    nom,
    number_demarches_simplifiées: "456",
    activité_principale: "Travaux",
    rattaché_au_régime_ae: false,
    historique_identifiant_demande_onagre: null,
    communes: null,
    départements: ["01"],
    régions: null,
    déposant_nom: "Durand",
    déposant_prénoms: "Alice",
    demandeur_personne_physique_nom: "Durand",
    demandeur_personne_physique_prénoms: "Alice",
    demandeur_personne_morale_raison_sociale: null,
    demandeur_personne_morale_siret: null,
    phase: "Accompagnement amont",
    prochaine_action_attendue_par: null,
    date_dépôt: "2026-01-15",
    date_début_phase: "2026-01-15",
    enjeu: false,
    commentaire_libre: "",
  } as unknown as DossierRésumé;
}

afterEach(() => {
  cleanup();
  store.dossiersComplets.clear();
  store.dossiersRésumés.clear();
  store.capabilities = {};
  store.identité = undefined;
});

test("after a DN synchronization, the tous-les-dossiers page displays the up-to-date dossier", async () => {
  // the dossier was visited before the synchronization
  store.dossiersComplets.set(DOSSIER_ID, fakeDossierComplet(NOM_BEFORE_SYNC));
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    listerDossiers: vi.fn().mockResolvedValue([fakeDossierResume(NOM_AFTER_SYNC)]),
  } as unknown as PitchouState["capabilities"];

  render(PageTousLesDossiers);

  await waitFor(() => {
    expect(screen.getByText(NOM_AFTER_SYNC)).toBeTruthy();
  });
  expect(screen.queryByText(NOM_BEFORE_SYNC)).toBeNull();
});

test("after a DN synchronization, the page of an already visited dossier also displays the up-to-date dossier", async () => {
  // the dossier was visited before the synchronization
  store.dossiersComplets.set(DOSSIER_ID, fakeDossierComplet(NOM_BEFORE_SYNC));
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];

  // the server now responds with the synchronized dossier, but not instantly
  let respondToRefresh: ((dossier: DossierComplet) => void) | undefined;
  store.capabilities = {
    recupérerDossierComplet: vi.fn().mockReturnValue(
      new Promise<DossierComplet>((resolve) => {
        respondToRefresh = resolve;
      }),
    ),
    modifierDossier: vi.fn().mockResolvedValue(undefined),
  } as unknown as PitchouState["capabilities"];

  // same call as the load of the dossier/[dossierId] route
  await getDossierComplet(DOSSIER_ID);
  render(PageDossier, {
    data: { dossierId: DOSSIER_ID },
    params: { dossierId: String(DOSSIER_ID) },
  });

  // the cached version is displayed immediately, without waiting for the server
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(NOM_BEFORE_SYNC);

  // the server response arrives: the up-to-date dossier must replace the cached one
  respondToRefresh?.(fakeDossierComplet(NOM_AFTER_SYNC));
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(NOM_AFTER_SYNC);
  });
});
