import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.min.css";
import "@gouvfr/dsfr/dist/utility/utility.min.css";
import "../../../app.css";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/tous-les-dossiers") }) };
});
vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { goto } from "$app/navigation";
import { page as route } from "$app/state";
import { sendDossierSearchEvent } from "$lib/shared/aarri.ts";
import { store } from "$lib/state/store.svelte.ts";
import ListDossiers from "./ListDossiers.svelte";
import MesDossiers from "../../../routes/mes-dossiers/MesDossiers.svelte";
import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

const routeState: { url: URL } = route;
const summaries = (
  [
    [1, "complet", ["44", "49"], "Owned"],
    [2, "lecture", ["49"], "Foreign nearby"],
    [3, "lecture", ["75"], "Foreign elsewhere"],
    [4, "lecture", null, "Missing department"],
    [5, "lecture", ["unknown"], "Unknown code"],
    [6, "complet", ["33", "85"], "Owned unfollowed"],
    [7, "complet", null, "Owned without department"],
  ] satisfies [number, "complet" | "lecture", string[] | null, string][]
).map(([id, access, departments, name]) =>
  makeDossier({ id: dossierId(id), access, departments, name }),
);

beforeEach(() => {
  vi.clearAllMocks();
  routeState.url = new URL("http://localhost/tous-les-dossiers");
  vi.mocked(goto).mockImplementation(async (url) => {
    routeState.url = new URL(url.toString(), routeState.url);
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ groupes: [], activites: [] }))),
  );
  store.dossierSummaries.clear();
  for (const dossier of summaries) store.dossierSummaries.set(dossier.id, dossier);
});

afterEach(async () => {
  cleanup();
  store.dossierSummaries.clear();
  vi.unstubAllGlobals();
  await page.viewport(1280, 720);
});

test.each([1280, 390])(
  "location radios and all/none/custom selection work at %ipx",
  async (width) => {
    await page.viewport(width, 900);
    render(ListDossiers, {
      title: "Tous les dossiers",
      dossiers: summaries,
      notificationByDossier: store.notificationByDossier,
    });
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Owned without department" })).toHaveAttribute(
      "href",
      "/dossier/7",
    );
    expect(screen.queryByRole("link", { name: "Foreign nearby" })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Filtres" }));
    const dialog = screen.getByRole("dialog");
    const location = within(dialog).getByRole("group", { name: "Localisation" });
    const filters = within(location);
    expect(location.querySelector(".fr-icon-map-pin-2-line")).not.toBeNull();
    expect(filters.getByRole("radio", { name: "Mes territoires d'affectation" })).toBeChecked();
    expect(
      filters.getByRole("button", { name: "Tous les départements" }).getBoundingClientRect().top -
        filters.getByText("Mes territoires d'affectation").getBoundingClientRect().bottom,
    ).toBeGreaterThanOrEqual(8);
    await fireEvent.click(filters.getByRole("button", { name: "Tous les départements" }));
    expect(filters.getAllByRole("checkbox")).toHaveLength(4);
    expect(filters.getByRole("checkbox", { name: /49/ })).toBeChecked();
    await fireEvent.click(filters.getByRole("button", { name: "Aucun" }));
    expect(routeState.url.searchParams.get("departements")).toBe("none");
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(0);
    expect(filters.getByRole("button", { name: "Aucun département" })).toBeTruthy();
    await fireEvent.click(filters.getByRole("checkbox", { name: /49/ }));
    expect(routeState.url.searchParams.getAll("departement")).toEqual(["49"]);
    expect(routeState.url.searchParams.get("departements")).toBe("custom");
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Owned" })).toHaveAttribute("href", "/dossier/1");
    await fireEvent.click(filters.getByRole("radio", { name: "France entière (lecture seule)" }));
    expect(routeState.url.searchParams.get("localisation")).toBe("france");
    expect(routeState.url.searchParams.has("departements")).toBe(false);
    expect(routeState.url.searchParams.has("departement")).toBe(false);
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(7);
    for (const dossier of summaries) {
      expect(screen.getByRole("link", { name: dossier.name! })).toHaveAttribute(
        "href",
        `/dossier/${dossier.id}?lecture=1`,
      );
    }
    expect(
      filters.getByRole("button", { name: "Tous les départements" }).getBoundingClientRect().top -
        filters.getByText("France entière (lecture seule)").getBoundingClientRect().bottom,
    ).toBeGreaterThanOrEqual(8);
    await fireEvent.click(filters.getByRole("button", { name: "Tous les départements" }));
    expect(filters.getByRole("checkbox", { name: /75.*Paris/ })).toBeTruthy();
    expect(filters.getByRole("checkbox", { name: /unknown/ })).toBeTruthy();
    await fireEvent.click(filters.getByRole("button", { name: "Aucun" }));
    await fireEvent.click(filters.getByRole("button", { name: "Tout" }));
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(7);
    expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    await fireEvent.click(within(dialog).getByRole("button", { name: "Tout effacer" }));
    expect(routeState.url.search).toBe("");
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(3);
  },
);

test.each(["", "?localisation=france"])(
  "My dossiers always uses assigned scope with URL %s",
  async (search) => {
    routeState.url = new URL(`http://localhost/mes-dossiers${search}`);
    render(MesDossiers, {
      email: "owner@example.org",
      dossiers: [summaries[0]],
      followRelations: new Map([["owner@example.org", new Set([summaries[0].id])]]),
      notificationByDossier: store.notificationByDossier,
    });
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Owned" })).toHaveAttribute("href", "/dossier/1");
    expect(screen.getByTestId("compteur-dossier").textContent).toContain(
      "1 dossiers suivis dans vos territoires d'affectation",
    );
    expect(screen.queryByText("France entière (lecture seule)")).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Filtres" }));
    const filters = within(screen.getByRole("group", { name: "Localisation" }));
    expect(filters.queryAllByRole("radio")).toHaveLength(0);
    await fireEvent.click(filters.getByRole("button", { name: "Tous les départements" }));
    expect(filters.getAllByRole("checkbox")).toHaveLength(4);
    for (const code of ["33", "44", "49", "85"]) {
      expect(filters.getByRole("checkbox", { name: new RegExp(`^${code} `) })).toBeChecked();
    }
    expect(filters.queryByRole("checkbox", { name: /75.*Paris/ })).toBeNull();
    expect(filters.queryByRole("checkbox", { name: /unknown/ })).toBeNull();
    await fireEvent.click(filters.getByRole("button", { name: "Aucun" }));
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(0);
    await fireEvent.click(filters.getByRole("checkbox", { name: /^33 / }));
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(0);
    await fireEvent.click(filters.getByRole("checkbox", { name: /^49 / }));
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(1);
    expect(routeState.url.searchParams.has("localisation")).toBe(false);
    expect(routeState.url.searchParams.getAll("departement")).toEqual(["33", "49"]);
    expect(routeState.url.searchParams.get("departements")).toBe("custom");
    await fireEvent.click(screen.getByRole("button", { name: "Voir 1 résultat" }));
    expect(sendDossierSearchEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resultCount: 1,
        filters: expect.objectContaining({
          localisation: "assigned",
          departementSelection: "custom",
        }),
      }),
    );
    routeState.url = new URL("http://localhost/mes-dossiers?localisation=france&departement=33");
    await tick();
    expect(screen.queryAllByTestId("card-dossier")).toHaveLength(0);
    routeState.url = new URL("http://localhost/mes-dossiers?localisation=france&departement=49");
    await tick();
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Owned" })).toHaveAttribute("href", "/dossier/1");
  },
);

test("generic multi-select retains its empty-array convention", async () => {
  const onChange = vi.fn();
  render(MultiSelectFilter, {
    id: "generic",
    label: "Generic",
    allLabel: "Toutes les options",
    selected: [],
    options: [{ value: "a", label: "Option A" }],
    onChange,
  });
  await fireEvent.click(screen.getByRole("button", { name: "Toutes les options" }));
  expect(screen.getByRole("checkbox", { name: "Option A" })).not.toBeChecked();
  await fireEvent.click(screen.getByRole("button", { name: "Aucun" }));
  expect(onChange).toHaveBeenLastCalledWith([], "none");
  expect(screen.getByRole("button", { name: "Toutes les options" })).toBeTruthy();
});
