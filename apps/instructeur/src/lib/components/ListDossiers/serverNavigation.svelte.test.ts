import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/tous-les-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendEvenement: vi.fn(),
  sendDossierSearchEvent: vi.fn(),
}));
import { page as route } from "$app/state";
import { goto } from "$app/navigation";
import TousPage from "../../../routes/tous-les-dossiers/+page.svelte";
import { store } from "#lib/state/store.svelte.ts";
import { makeDossier, makeServerPage } from "./testHelpers.ts";

const state: Pick<typeof route, "url"> = route;
const origin = "http://localhost/tous-les-dossiers";
const options = {
  activites: [{ code: "eolien", label: "Activité hors page" }],
  assignedDepartments: ["44"],
  instructeurs: ["ailleurs@example.fr"],
};
function mockRequests(load: (params: URLSearchParams, signal: AbortSignal) => Promise<Response>) {
  const fetcher = vi.fn((url: string, init?: RequestInit) =>
    url.startsWith("/dossiers/page")
      ? load(new URL(url, origin).searchParams, init!.signal as AbortSignal)
      : Promise.resolve(
          Response.json(
            url.startsWith("/dossiers/options") ? options : { groupes: [], activites: [] },
          ),
        ),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
function result(name: string, page = 1) {
  return makeServerPage({
    items: [makeDossier({ name })],
    total: 21,
    totalDemandes: 32,
    scopeTotal: 21,
    page,
  });
}
beforeEach(() => {
  state.url = new URL(origin);
  vi.mocked(goto).mockImplementation(async (url) => {
    state.url = new URL(String(url), origin);
  });
  store.identité = { email: "test@example.fr", groupesInstructeurs: [], estAdmin: false };
});
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.identité = undefined;
  store.dossierSummaries.clear();
  store.followRelations = undefined;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("keeps rows during requests, aborts stale requests and ignores their late success", async () => {
  const old = Promise.withResolvers<Response>();
  const newer = Promise.withResolvers<Response>();
  let oldSignal: AbortSignal;
  mockRequests(async (params, signal) => {
    if (params.get("q") === "old") {
      oldSignal = signal;
      return old.promise;
    }
    if (params.get("q") === "new") return newer.promise;
    return Response.json(result("Initial"));
  });
  render(TousPage);
  await screen.findByText("Initial");
  state.url = new URL(`${origin}?q=old`);
  await screen.findByText("Actualisation des dossiers…");
  expect(screen.getByText("Initial")).toBeTruthy();
  state.url = new URL(`${origin}?q=new`);
  await tick();
  expect(oldSignal!.aborted).toBe(true);
  newer.resolve(Response.json(result("New response")));
  await screen.findByText("New response");
  old.resolve(Response.json(result("Stale response")));
  await tick();
  expect(screen.queryByText("Stale response")).toBeNull();
  expect(screen.getByText("New response")).toBeTruthy();
  // A browser history change is authoritative, even after overlapping searches.
  state.url = new URL(origin);
  await screen.findByText("Initial");
});

test("uses server totals and page rows without slicing; clamps the URL while preserving filters", async () => {
  state.url = new URL(
    `${origin}?q=marais&phase=Instruction&localisation=france&sort=nextDueDate&order=asc&page=99`,
  );
  const fetcher = mockRequests(async () => Response.json(result("Page representative", 3)));
  render(TousPage);
  await screen.findByText("Page representative");
  expect(screen.getAllByTestId("card-dossier")).toHaveLength(1);
  expect(screen.getByTestId("compteur-dossier").textContent).toContain("21");
  await expect.poll(() => state.url.searchParams.get("page")).toBe("3");
  expect(state.url.searchParams.get("q")).toBe("marais");
  expect(state.url.searchParams.get("localisation")).toBe("france");
  expect(screen.queryByRole("button", { name: /Plus d’actions/u })).toBeNull();
  expect(screen.getByRole("link", { name: "Page representative" })).toHaveAttribute(
    "href",
    "/dossier/1?lecture=1",
  );
  await fireEvent.click(screen.getByRole("button", { name: "Page précédente" }));
  await expect
    .poll(() =>
      fetcher.mock.calls.some(([url]) => new URL(url, origin).searchParams.get("page") === "2"),
    )
    .toBe(true);
});

test("debounces search text and keeps every URL filter in the page request", async () => {
  const fetcher = mockRequests(async () => Response.json(result("Representative")));
  render(TousPage);
  await screen.findByText("Representative");
  const input = screen.getByRole("searchbox");
  await fireEvent.input(input, { target: { value: "m" } });
  await fireEvent.input(input, { target: { value: "ma" } });
  await fireEvent.input(input, { target: { value: "marais" } });
  expect(fetcher.mock.calls.filter(([url]) => url.startsWith("/dossiers/page"))).toHaveLength(1);
  await expect.poll(() => state.url.searchParams.get("q")).toBe("marais");
  await expect
    .poll(() => fetcher.mock.calls.filter(([url]) => url.startsWith("/dossiers/page")).length)
    .toBe(2);
  state.url = new URL(
    `${origin}?phase=Instruction&activite=eolien&espece=123&action=Instructeur&departement=44&instructeur=ailleurs%40example.fr&nouveaute=non&actionInstructeur=1&enjeu=1&decision=ABC&decisionAbsente=1&avisManquant=1&especesAbsente=1&from=2024-01-01&to=2025-01-01&dateField=nextDue&sort=nextDueDate&order=asc&pageSize=25`,
  );
  await expect
    .poll(() => fetcher.mock.calls.some(([url]) => url.includes("decision=ABC")))
    .toBe(true);
  const params = new URL(
    fetcher.mock.calls.find(([url]) => url.includes("decision=ABC"))![0],
    origin,
  ).searchParams;
  expect(params.get("timeZone")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  for (const key of [
    "phase",
    "activite",
    "espece",
    "action",
    "departement",
    "instructeur",
    "nouveaute",
    "actionInstructeur",
    "enjeu",
    "decision",
    "decisionAbsente",
    "avisManquant",
    "especesAbsente",
    "from",
    "to",
    "dateField",
    "sort",
    "order",
    "pageSize",
  ]) {
    expect(params.get(key)).toBe(state.url.searchParams.get(key));
  }
});

test("filter options include activities and instructeurs outside the visible page", async () => {
  mockRequests(async () => Response.json(result("Representative")));
  render(TousPage);
  await screen.findByText("Representative");
  await fireEvent.click(screen.getByRole("button", { name: "Filtres" }));
  await fireEvent.click(screen.getByRole("button", { name: "Toutes les activités" }));
  expect(screen.getByRole("checkbox", { name: "Activité hors page" })).toBeTruthy();
  await fireEvent.click(screen.getByRole("checkbox", { name: "Activité hors page" }));
  await fireEvent.click(screen.getByRole("button", { name: "Tous les instructeur·ices" }));
  expect(screen.getByRole("checkbox", { name: "ailleurs@example.fr" })).toBeTruthy();
});
