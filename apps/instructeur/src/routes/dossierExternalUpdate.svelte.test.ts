import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";

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

import { store, setDossierFull } from "$lib/state/store.svelte.ts";
import { updateDossierNextDueDate } from "$lib/dossier/dossier.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the instruction form is not the only thing writing to the dossier it
// shows. The header's actions menu sets the next échéance, another instructrice of
// the service edits the same dossier and a background refresh brings her change.
// The form reconciles its champs with the dossier, so it has to tell what it holds
// unsaved from what changed under it — otherwise it undoes the change it just saw.

const DOSSIER_ID = 123 as DossierId;

let modifierDossier: ReturnType<typeof vi.fn>;

function pageProps() {
  return {
    data: { dossierId: DOSSIER_ID, readOnly: false, fullWidth: true },
    params: { dossierId: String(DOSSIER_ID) },
  };
}

beforeEach(() => {
  modifierDossier = vi.fn().mockResolvedValue(undefined);
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    modifierDossier,
    listerActionsDossier: vi.fn().mockResolvedValue([]),
  } as unknown as PitchouState["capabilities"];
});

afterEach(() => {
  cleanup();
  store.fullDossiers.clear();
  store.readOnlyDossiers.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
  store.identité = undefined;
});

test("an échéance set from the actions menu is not undone by the instruction form", async () => {
  const echeance = new Date("2026-09-30T00:00:00");
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, next_due_date: null }));

  render(PageDossier, pageProps());
  await tick();

  // same call as the header's « Modifier la date de la prochaine échéance »
  await updateDossierNextDueDate(DOSSIER_ID, echeance);
  await tick();

  expect(modifierDossier).toHaveBeenCalledTimes(1);
  expect(modifierDossier).toHaveBeenCalledWith(DOSSIER_ID, { next_due_date: echeance });
  expect(store.fullDossiers.get(DOSSIER_ID)?.next_due_date).toEqual(echeance);
});

test("a champ another instructrice changed is not overwritten when the refresh brings it", async () => {
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, enjeu: false }));

  render(PageDossier, pageProps());
  await tick();

  // what the stale-while-revalidate refresh of the dossier does with the fresher
  // dossier the server answered
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, enjeu: true }));
  await tick();

  expect(modifierDossier).not.toHaveBeenCalled();
  expect(store.fullDossiers.get(DOSSIER_ID)?.enjeu).toBe(true);
  await waitFor(() => {
    expect(screen.getByLabelText(/enjeu/i)).toBeTruthy();
  });
});
