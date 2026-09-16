import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/state", () => ({ page: { state: {} } }));
vi.mock("$env/dynamic/public", () => ({ env: { PUBLIC_PITCHOU_ENV: "" } }));

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

import { store } from "$lib/state/store.svelte.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";
import {
  dossierPageProps as pageProps,
  resetDossierPageState,
  setupDossierPageState,
} from "./dossierPageTestSetup.ts";

import type { DossierAction } from "@pitchou/types/capabilities.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the instructeur goes from one dossier to the next without ever leaving
// the dossier page — SvelteKit keeps the same components mounted, so anything they
// hold about the dossier they were showing has to go with it. What one dossier is
// worth must never be written onto, nor read for, the next one.

const FIRST = 1 as DossierId;
const SECOND = 2 as DossierId;

let modifierDossier: ReturnType<typeof vi.fn>;
let updateNotificationForDossier: ReturnType<typeof vi.fn>;
let actionsByDossier: Map<DossierId, DossierAction[]>;

beforeEach(() => {
  ({ modifierDossier, updateNotificationForDossier, actionsByDossier } = setupDossierPageState());
});

afterEach(resetDossierPageState);

test("the instruction champs of a dossier are not saved onto the next one", async () => {
  store.fullDossiers.set(
    FIRST,
    fakeDossierFull({ id: FIRST, name: "Premier dossier", enjeu: true, ddep_required: true }),
  );
  store.fullDossiers.set(
    SECOND,
    fakeDossierFull({ id: SECOND, name: "Second dossier", enjeu: false, ddep_required: null }),
  );

  const { rerender } = render(PageDossier, pageProps(FIRST));
  expect(screen.getByRole("heading", { level: 2, name: "Premier dossier" })).toBeTruthy();

  await rerender(pageProps(SECOND));
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2, name: "Second dossier" })).toBeTruthy();
  });
  await tick();

  expect(modifierDossier).not.toHaveBeenCalled();
  expect(store.fullDossiers.get(SECOND)?.enjeu).toBe(false);
  expect(store.fullDossiers.get(SECOND)?.ddep_required).toBe(null);
});

test("the header notification belongs to the dossier currently shown", async () => {
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST, name: "Premier dossier" }));
  store.fullDossiers.set(SECOND, fakeDossierFull({ id: SECOND, name: "Second dossier" }));
  store.notificationByDossier.set(FIRST, {
    viewed: true,
    updated_at: new Date("2026-08-01"),
    viewed_at: new Date("2026-08-10"),
    new_arrival: null,
    new_follow: null,
    changes: [],
  });
  store.notificationByDossier.set(SECOND, {
    viewed: true,
    updated_at: new Date("2026-08-05"),
    viewed_at: null,
    new_arrival: { detected_at: new Date("2026-08-05") },
    new_follow: null,
    changes: [],
  });
  actionsByDossier.set(SECOND, [
    {
      type: "champ_modifie",
      data: { field: "Nom du projet" },
      created_at: new Date("2026-08-05"),
      author_petitionnaire: true,
    } as unknown as DossierAction,
  ]);

  const { rerender } = render(PageDossier, pageProps(FIRST));
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 2, name: "Premier dossier" })).toBeTruthy();
  });
  expect(screen.queryByText("Nouveau dossier")).toBeNull();

  await rerender(pageProps(SECOND));
  await waitFor(() => {
    expect(screen.getByText("Nouveau dossier")).toBeTruthy();
  });
});

test("the header no longer exposes a manual read toggle or the old five-second timer", async () => {
  vi.useFakeTimers();
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST, name: "Premier dossier" }));
  store.fullDossiers.set(SECOND, fakeDossierFull({ id: SECOND, name: "Second dossier" }));
  store.notificationByDossier.set(FIRST, {
    viewed: true,
    updated_at: new Date("2026-08-01"),
    viewed_at: new Date("2026-08-10"),
    new_arrival: null,
    new_follow: null,
    changes: [],
  });
  store.notificationByDossier.set(SECOND, {
    viewed: false,
    updated_at: new Date("2026-08-05"),
    viewed_at: null,
    new_arrival: null,
    new_follow: null,
    changes: [],
  });

  const { rerender } = render(PageDossier, pageProps(FIRST));
  await tick();

  expect(screen.queryByRole("button", { name: /Marquer le dossier comme/ })).toBeNull();

  await rerender(pageProps(SECOND));
  await tick();

  await vi.advanceTimersByTimeAsync(5000);
  expect(updateNotificationForDossier).not.toHaveBeenCalled();
});

test("successful instruction saves show the header tag for three seconds and restart its timer", async () => {
  vi.useFakeTimers();
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST }));
  render(PageDossier, pageProps(FIRST));
  const field = screen.getByLabelText("N° de dossier Onagre");
  expect(screen.queryByText("Dossier mis à jour")).toBeNull();
  await fireEvent.input(field, { target: { value: "ONAGRE-1" } });
  await vi.advanceTimersByTimeAsync(1000);
  await tick();
  expect(screen.getByText("Dossier mis à jour")).toBeTruthy();
  await vi.advanceTimersByTimeAsync(1500);
  await fireEvent.input(field, { target: { value: "ONAGRE-2" } });
  await vi.advanceTimersByTimeAsync(1000);
  await tick();
  await vi.advanceTimersByTimeAsync(2999);
  expect(screen.getByText("Dossier mis à jour")).toBeTruthy();
  await vi.advanceTimersByTimeAsync(1);
  await tick();
  expect(screen.queryByText("Dossier mis à jour")).toBeNull();
});
