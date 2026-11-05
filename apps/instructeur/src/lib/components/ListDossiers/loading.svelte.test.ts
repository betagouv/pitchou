import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/mes-dossiers") }) };
});
vi.mock("#lib/shared/aarri.ts", () => ({
  sendEvenement: vi.fn(),
  sendDossierSearchEvent: vi.fn(),
}));
import MesPage from "../../../routes/mes-dossiers/+page.svelte";
import TousPage from "../../../routes/tous-les-dossiers/+page.svelte";
import { store } from "#lib/state/store.svelte.ts";
import { makeDossier, makeServerPage } from "./testHelpers.ts";

beforeEach(() => {
  store.identité = { email: "test@example.fr", groupesInstructeurs: [], estAdmin: false };
});
afterEach(() => {
  cleanup();
  store.capabilities = {};
  store.dossierSummaries.clear();
  store.followRelations = undefined;
  store.notificationByDossier.clear();
  store.identité = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const options = { activites: [], assignedDepartments: [], instructeurs: [] };

test.each([MesPage, TousPage])(
  "loading waits for its page and never fetches full collections",
  async (Page) => {
    const response = Promise.withResolvers<Response>();
    const fetcher = vi.fn((url: string) =>
      url.startsWith("/dossiers/page") ? response.promise : Promise.resolve(Response.json(options)),
    );
    vi.stubGlobal("fetch", fetcher);
    const legacy = vi.fn().mockRejectedValue(new Error("Full collection must not load"));
    store.capabilities = {
      listerDossiers: legacy,
      listFollowRelations: legacy,
      listerNotifications: legacy,
    };
    render(Page);
    await tick();
    expect(screen.getByText("Chargement des dossiers…")).toBeTruthy();
    expect(screen.queryByText(/aucun dossier/iu)).toBeNull();
    expect(screen.getByRole("searchbox")).toBeDisabled();
    response.resolve(
      Response.json(makeServerPage({ items: [makeDossier()], total: 1, scopeTotal: 1 })),
    );
    await screen.findByTestId("card-dossier");
    expect(screen.getByRole("searchbox")).not.toBeDisabled();
    expect(legacy).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.map(([url]) => url.split("?")[0]).sort()).toEqual([
      "/dossiers/options",
      "/dossiers/page",
    ]);
  },
);

test.each([MesPage, TousPage])(
  "failure shows a retry and only a successful retry announces zero",
  async (Page) => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.startsWith("/dossiers/options")
            ? Response.json(options)
            : fail
              ? new Response("Unavailable", { status: 503 })
              : Response.json(makeServerPage()),
        ),
      ),
    );
    render(Page);
    await screen.findByRole("alert");
    expect(screen.queryByText(/aucun dossier/iu)).toBeNull();
    expect(screen.getByTestId("compteur-dossier").textContent).toContain("indisponible");
    expect(screen.getByRole("searchbox")).toBeDisabled();
    fail = false;
    await fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    await expect
      .poll(() => screen.getByTestId("compteur-dossier").textContent?.trim())
      .toMatch(/^0/u);
    expect(screen.queryByRole("alert")).toBeNull();
  },
);
