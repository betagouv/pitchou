import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
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
import {
  refreshDossierFull,
  updateDossier,
  updateDossierNextDueDate,
} from "$lib/dossier/dossier.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";
import { dossierPageProps, resetDossierPageState } from "./dossierPageTestSetup.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the instruction form is not the only thing writing to the dossier it
// shows. The header's actions menu sets the next échéance, another instructrice of
// the service edits the same dossier and a background refresh brings her change.
// The form reconciles its champs with the dossier, so it has to tell what it holds
// unsaved from what changed under it — otherwise it undoes the change it just saw.

const DOSSIER_ID = 123 as DossierId;

let modifierDossier: ReturnType<typeof vi.fn>;

beforeEach(() => {
  modifierDossier = vi.fn().mockResolvedValue(undefined);
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    modifierDossier,
    listerActionsDossier: vi.fn().mockResolvedValue([]),
  } as unknown as PitchouState["capabilities"];
});

afterEach(resetDossierPageState);

test("an échéance set from the actions menu is not undone by the instruction form", async () => {
  const echeance = new Date("2026-09-30T00:00:00");
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, next_due_date: null }));

  render(PageDossier, dossierPageProps(DOSSIER_ID));
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

  render(PageDossier, dossierPageProps(DOSSIER_ID));
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

test("the numéro Onagre being typed survives a background refresh and is saved as shown", async () => {
  vi.useFakeTimers();
  // the fixture leaves the numéro Onagre empty
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID }));

  render(PageDossier, dossierPageProps(DOSSIER_ID));
  await tick();

  const input = screen.getByLabelText("N° de dossier Onagre") as HTMLInputElement;
  input.value = "2026";
  await fireEvent.input(input);

  // a background refresh lands mid-typing, carrying a colleague's unrelated change
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, enjeu: true }));
  await tick();

  expect(input.value).toBe("2026");

  await vi.advanceTimersByTimeAsync(1000);
  expect(modifierDossier).toHaveBeenCalledTimes(1);
  expect(modifierDossier).toHaveBeenCalledWith(DOSSIER_ID, { onagre_demande_identifier: "2026" });
});

test("a champ saved while a refresh is in flight is not undone when the stale payload lands", async () => {
  let resolveRefresh: (dossier: DossierFull) => void = () => {};
  store.capabilities = {
    modifierDossier,
    recupérerDossierComplet: vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    ),
  } as unknown as PitchouState["capabilities"];
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, enjeu: false }));

  const refreshing = refreshDossierFull(DOSSIER_ID);
  await updateDossier(store.fullDossiers.get(DOSSIER_ID)!, { enjeu: true });

  // the payload was built by the server before the save reached it
  resolveRefresh(fakeDossierFull({ id: DOSSIER_ID, enjeu: false }));
  await refreshing;

  expect(store.fullDossiers.get(DOSSIER_ID)?.enjeu).toBe(true);
});

test("a failed save rolls back its own champ only, not one saved meanwhile", async () => {
  setDossierFull(fakeDossierFull({ id: DOSSIER_ID, enjeu: false }));
  let rejectFirst: (err: Error) => void = () => {};
  modifierDossier
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectFirst = reject;
        }),
    )
    .mockImplementationOnce(() => Promise.resolve());

  const failing = updateDossier(store.fullDossiers.get(DOSSIER_ID)!, { enjeu: true });
  await updateDossier(store.fullDossiers.get(DOSSIER_ID)!, {
    onagre_demande_identifier: "2026-01",
  });

  rejectFirst(new Error("boom"));
  await expect(failing).rejects.toThrow("boom");

  const current = store.fullDossiers.get(DOSSIER_ID);
  expect(current?.enjeu).toBe(false);
  expect(current?.onagre_demande_identifier).toBe("2026-01");
});
