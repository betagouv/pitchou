import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";
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

import { store } from "$lib/state/store.svelte.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";
import { dossierPageProps as pageProps, resetDossierPageState } from "./dossierPageTestSetup.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
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
  modifierDossier = vi.fn().mockResolvedValue(undefined);
  updateNotificationForDossier = vi.fn().mockResolvedValue(undefined);
  actionsByDossier = new Map();
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    modifierDossier,
    updateNotificationForDossier,
    listerActionsDossier: vi.fn((id: DossierId) => Promise.resolve(actionsByDossier.get(id) ?? [])),
  } as unknown as PitchouState["capabilities"];
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
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Premier dossier");

  await rerender(pageProps(SECOND));
  await waitFor(() => {
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Second dossier");
  });
  await tick();

  expect(modifierDossier).not.toHaveBeenCalled();
  expect(store.fullDossiers.get(SECOND)?.enjeu).toBe(false);
  expect(store.fullDossiers.get(SECOND)?.ddep_required).toBe(null);
});

test("the « nouvelles modifications » badges are computed against the read date of the dossier shown", async () => {
  // The first dossier was read after its last modification, the second was never
  // read at all — so only the second is entitled to a badge.
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST, name: "Premier dossier" }));
  store.fullDossiers.set(SECOND, fakeDossierFull({ id: SECOND, name: "Second dossier" }));
  store.notificationByDossier.set(FIRST, {
    viewed: true,
    updated_at: new Date("2026-08-01"),
    viewed_at: new Date("2026-08-10"),
  });
  store.notificationByDossier.set(SECOND, {
    viewed: true,
    updated_at: new Date("2026-08-05"),
    viewed_at: null,
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
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Premier dossier");
  });
  expect(screen.queryByText("Nouvelles modifications")).toBeNull();

  await rerender(pageProps(SECOND));
  await waitFor(() => {
    expect(screen.getAllByText("Nouvelles modifications").length).toBeGreaterThan(0);
  });
});

test("marking a dossier unread does not keep the next one unread", async () => {
  vi.useFakeTimers();
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST, name: "Premier dossier" }));
  store.fullDossiers.set(SECOND, fakeDossierFull({ id: SECOND, name: "Second dossier" }));
  store.notificationByDossier.set(FIRST, {
    viewed: true,
    updated_at: new Date("2026-08-01"),
    viewed_at: new Date("2026-08-10"),
  });
  store.notificationByDossier.set(SECOND, {
    viewed: false,
    updated_at: new Date("2026-08-05"),
    viewed_at: null,
  });

  const { rerender } = render(PageDossier, pageProps(FIRST));
  await tick();

  screen.getByTitle("Marquer le dossier comme non lu").click();
  await tick();
  expect(updateNotificationForDossier).toHaveBeenCalledWith({ dossier: FIRST, viewed: false });

  await rerender(pageProps(SECOND));
  await tick();

  // Staying a few seconds on a dossier with an unread notification consumes it,
  // whatever was done on the dossier visited before.
  await vi.advanceTimersByTimeAsync(5000);
  expect(updateNotificationForDossier).toHaveBeenCalledWith({ dossier: SECOND, viewed: true });
});
