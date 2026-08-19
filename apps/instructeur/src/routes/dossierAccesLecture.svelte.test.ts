import { afterEach, expect, test, vi } from "vitest";
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

import { store } from "$lib/state/store.svelte.ts";
import { getDossierFull } from "$lib/dossier/dossier.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Scenario: the dossier was only shared in read-only with the instructeur's groupe,
// so the server narrows the payload and answers `access: "lecture"` whatever the
// request asked for. The URL, on the other hand, may perfectly well not carry
// `?lecture=1` — a bookmark, a link someone re-typed, a query param dropped on the
// way. The page must still display the dossier it received.

const DOSSIER_ID = 123 as DossierId;
const NOM = "Dossier partagé en lecture";

afterEach(() => {
  cleanup();
  store.fullDossiers.clear();
  store.readOnlyDossiers.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
  store.identité = undefined;
});

function setUpSharedDossier() {
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    recupérerDossierComplet: vi
      .fn()
      .mockResolvedValue(fakeDossierFull({ id: DOSSIER_ID, name: NOM, access: "lecture" })),
  } as unknown as PitchouState["capabilities"];
}

test("a dossier shared in read-only is displayed even when the URL does not ask for read-only", async () => {
  setUpSharedDossier();

  // same call as the load of the dossier/[dossierId] route, without `?lecture=1`
  await getDossierFull(DOSSIER_ID, { readOnly: false });
  render(PageDossier, {
    data: { dossierId: DOSSIER_ID, readOnly: false, fullWidth: true },
    params: { dossierId: String(DOSSIER_ID) },
  });

  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(NOM);
  // the payload is narrowed, so the page says so, whatever the URL asked for
  expect(screen.getByText("Dossier en lecture seule")).toBeTruthy();
});

test("a dossier shared in read-only never reaches the full dossiers cache", async () => {
  setUpSharedDossier();

  await getDossierFull(DOSSIER_ID, { readOnly: false });

  expect(store.fullDossiers.has(DOSSIER_ID)).toBe(false);
  expect(store.readOnlyDossiers.has(DOSSIER_ID)).toBe(true);
});
