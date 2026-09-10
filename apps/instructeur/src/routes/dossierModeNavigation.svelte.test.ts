import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterNavigate, goto, replaceState } from "$app/navigation";
import { page as kitPage } from "$app/state";

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

// Avoid fetching the espèces data files over HTTP from the dossier page.
vi.mock(import("$lib/especes/activitesMethodesMoyensDePoursuite.ts"), () => ({
  loadActivitesMethodesMoyensDePoursuite: vi.fn().mockReturnValue(new Promise(() => {})),
  loadEspecesProtegeesList: vi.fn().mockReturnValue(new Promise(() => {})),
}));

import { store } from "$lib/state/store.svelte.ts";
import { getDossierFull, updateDossier } from "$lib/dossier/dossier.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import PageDossier from "./dossier/[dossierId]/+page.svelte";
import { fakeDossierFull } from "./fakeDossier.ts";
import {
  dossierPageProps as pageProps,
  resetDossierPageState,
  setupDossierPageState,
} from "./dossierPageTestSetup.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const FIRST = 1 as DossierId;
const initialUrl = location.href;

test("leaving an owner's preview waits for full data before showing editable fields", async () => {
  const preview = fakeDossierFull({ id: FIRST, latestCommentaire: null });
  const full = fakeDossierFull({ id: FIRST, latestCommentaire: "Internal comment" });
  const response = Promise.withResolvers<DossierFull>();
  const fetch = vi.fn(() => response.promise);
  store.readOnlyDossiers.set(FIRST, preview);
  store.capabilities.recupérerDossierComplet = fetch;
  const loading = getDossierFull(FIRST);
  const { container } = render(PageDossier, pageProps(FIRST));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  expect(container.querySelector("#enjeu")).toBeNull();
  expect(store.fullDossiers.has(FIRST)).toBe(false);
  response.resolve(full);
  const loaded = await loading;
  await tick();
  expect(loaded.latestCommentaire).toBe("Internal comment");
  expect(container.querySelector("#enjeu")).not.toBeNull();
  await updateDossier(loaded, { enjeu: true });
  expect(store.fullDossiers.get(FIRST)?.latestCommentaire).toBe("Internal comment");
  expect(store.readOnlyDossiers.get(FIRST)).toBe(preview);
});

beforeEach(() => {
  history.replaceState({}, "", initialUrl);
  vi.mocked(afterNavigate).mockClear();
  vi.mocked(goto).mockClear();
  vi.mocked(replaceState).mockClear();
  kitPage.state = {};
  setupDossierPageState();
});

afterEach(() => {
  resetDossierPageState();
  store.followRelations?.clear();
  history.replaceState({}, "", initialUrl);
});

function navigateFrom(path?: string) {
  const callback = vi.mocked(afterNavigate).mock.calls[0][0];
  callback({ from: path ? { url: new URL(path, location.origin) } : null } as Parameters<
    typeof callback
  >[0]);
}

test("normal entry preserves an explicit tab while both mode switches reset Instruction and replace history", async () => {
  history.replaceState({}, "", `${location.pathname}?tab=avis`);
  const dossier = fakeDossierFull({ id: FIRST, access: "complet" });
  store.fullDossiers.set(FIRST, dossier);
  store.readOnlyDossiers.set(FIRST, dossier);
  const { rerender } = render(PageDossier, pageProps(FIRST));
  navigateFrom("/tous-les-dossiers?recherche=carriere");
  await tick();
  expect(screen.getByRole("tab", { name: "Avis d’experts" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  screen.getByRole("button", { name: /Plus d’actions/ }).click();
  await tick();
  expect(screen.queryByRole("menuitem", { name: /échéance/ })).toBeNull();
  expect(screen.queryByRole("menuitem", { name: /Partager.*lecture seule/ })).toBeNull();
  screen.getByRole("menuitem", { name: "Voir le dossier en lecture seule" }).click();
  await tick();
  const [readUrl, options] = vi.mocked(goto).mock.lastCall!;
  expect((readUrl as URL).search).toBe("?lecture=1");
  expect(options).toMatchObject({
    replaceState: true,
    state: { dossierReturnPath: "/tous-les-dossiers?recherche=carriere" },
  });
  expect(screen.getByRole("tab", { name: "Instruction" })).toHaveAttribute("aria-selected", "true");

  history.replaceState({}, "", `${location.pathname}?lecture=1&tab=avis`);
  await rerender({ ...pageProps(FIRST), data: { ...pageProps(FIRST).data, readOnly: true } });
  navigateFrom("/dossier/1?tab=avis");
  screen.getByRole("button", { name: "Repasser en mode édition" }).click();
  await tick();
  const [editUrl, editOptions] = vi.mocked(goto).mock.lastCall!;
  expect((editUrl as URL).search).toBe("");
  expect(editOptions).toMatchObject({ replaceState: true });

  screen.getByRole("button", { name: "Fermer le dossier" }).click();
  expect(goto).toHaveBeenLastCalledWith("/tous-les-dossiers?recherche=carriere", {
    replaceState: true,
  });
});

test.each([true, false])(
  "direct visits close to the appropriate list, following=%s",
  async (following) => {
    store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST }));
    if (following) store.followRelations?.set("instructeur@example.com", new Set([FIRST]));
    render(PageDossier, pageProps(FIRST));
    navigateFrom();
    await tick();
    screen.getByRole("button", { name: "Fermer le dossier" }).click();
    expect(goto).toHaveBeenCalledWith(following ? "/mes-dossiers" : "/tous-les-dossiers", {
      replaceState: true,
    });
  },
);

test("a reload retains the original list saved in history state", async () => {
  kitPage.state = { dossierReturnPath: "/mes-dossiers?recherche=test" };
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST }));
  render(PageDossier, pageProps(FIRST));
  navigateFrom();
  await tick();
  screen.getByRole("button", { name: "Fermer le dossier" }).click();
  expect(goto).toHaveBeenCalledWith("/mes-dossiers?recherche=test", { replaceState: true });
});

test("initial navigation tolerates a source without a URL", async () => {
  store.fullDossiers.set(FIRST, fakeDossierFull({ id: FIRST }));
  render(PageDossier, pageProps(FIRST));
  const callback = vi.mocked(afterNavigate).mock.calls[0][0];
  expect(() =>
    callback({ from: { url: null } } as unknown as Parameters<typeof callback>[0]),
  ).not.toThrow();
  await tick();
  screen.getByRole("button", { name: "Fermer le dossier" }).click();
  expect(goto).toHaveBeenCalledWith("/tous-les-dossiers", { replaceState: true });
});
