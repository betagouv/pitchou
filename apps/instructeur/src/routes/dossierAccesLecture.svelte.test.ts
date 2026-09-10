import { afterEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";

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
import { getDossierFull } from "$lib/dossier/dossier.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";
import { dossierPageProps, resetDossierPageState } from "./dossierPageTestSetup.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

// Dossiers outside the instructeur's groups always receive `access: "lecture"`,
// even without `?lecture=1`. The page must display the restricted response.

const DOSSIER_ID = 123 as DossierId;
const DOSSIER_NAME = "Dossier d'un autre service";

afterEach(resetDossierPageState);

function setUpReadOnlyDossier() {
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    recupérerDossierComplet: vi
      .fn()
      .mockResolvedValue(
        fakeDossierFull({ id: DOSSIER_ID, name: DOSSIER_NAME, access: "lecture" }),
      ),
  } as unknown as PitchouState["capabilities"];
}

test("a foreign dossier is displayed even when the URL does not ask for read-only", async () => {
  setUpReadOnlyDossier();

  // same call as the load of the dossier/[dossierId] route, without `?lecture=1`
  await getDossierFull(DOSSIER_ID, { readOnly: false });
  render(PageDossier, dossierPageProps(DOSSIER_ID));

  expect(screen.getByRole("heading", { level: 2, name: DOSSIER_NAME })).toBeTruthy();
  // the payload is narrowed, so the page says so, whatever the URL asked for
  expect(screen.getByText("Dossier en lecture seule")).toBeTruthy();
});

test("a foreign dossier never reaches the full dossiers cache", async () => {
  setUpReadOnlyDossier();

  await getDossierFull(DOSSIER_ID, { readOnly: false });

  expect(store.fullDossiers.has(DOSSIER_ID)).toBe(false);
  expect(store.readOnlyDossiers.has(DOSSIER_ID)).toBe(true);
});

test.each([false, true])(
  "read-only access never offers edit mode, lecture query=%s",
  async (readOnly) => {
    setUpReadOnlyDossier();
    store.capabilities.modifierDossier = vi.fn();
    await getDossierFull(DOSSIER_ID, { readOnly });
    render(PageDossier, {
      ...dossierPageProps(DOSSIER_ID),
      data: { ...dossierPageProps(DOSSIER_ID).data, readOnly },
    });
    expect(screen.queryByRole("button", { name: "Repasser en mode édition" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suivre ce dossier" })).toBeNull();
    expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();
  },
);

test("navigating back to a foreign dossier serves the cache instead of waiting for the server", async () => {
  setUpReadOnlyDossier();
  await getDossierFull(DOSSIER_ID, { readOnly: false });

  // The server slows to a crawl: the cached dossier must carry the navigation.
  store.capabilities = {
    recupérerDossierComplet: vi.fn().mockReturnValue(new Promise(() => {})),
  } as unknown as PitchouState["capabilities"];

  // same call as the load: the URL still does not ask for read-only
  const winner = await Promise.race([
    getDossierFull(DOSSIER_ID, { readOnly: false }).then(({ name }) => name),
    new Promise((resolve) => setTimeout(() => resolve("bloqué sur le serveur"), 50)),
  ]);

  expect(winner).toBe(DOSSIER_NAME);
});
