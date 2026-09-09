import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { page } from "vitest/browser";
import { tick } from "svelte";
import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/state", async () => {
  const { reactive } = await import("../../../../tests/helpers/reactive.svelte.ts");
  return { page: reactive({ url: new URL("http://localhost/mes-dossiers") }) };
});
vi.mock("$lib/shared/aarri.ts", () => ({
  sendDossierSearchEvent: vi.fn(),
  sendEvenement: vi.fn(),
}));

import { goto } from "$app/navigation";
import { page as route } from "$app/state";
import ListDossiers from "./ListDossiers.svelte";
import { dossierId, makeDossier } from "./testHelpers.ts";

const routeState: { url: URL } = route;
const dossiers = Array.from({ length: 60 }, (_, i) =>
  makeDossier({
    id: dossierId(i + 1),
    name: `Projet ${String(i + 1).padStart(2, "0")}`,
  }),
);

afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  await page.viewport(1280, 720);
});

async function followNavigation() {
  routeState.url = new URL(vi.mocked(goto).mock.lastCall![0].toString(), "http://localhost");
  await tick();
  return routeState.url.searchParams;
}

test.each(["mes-dossiers", "tous-les-dossiers"])(
  "%s changes page size, resets the page and preserves search/sort",
  async (path) => {
    routeState.url = new URL(
      `http://localhost/${path}?q=Projet&sort=nextDueDate&order=asc&pageSize=25&page=3`,
    );
    render(ListDossiers, { title: "Dossiers", dossiers, notificationByDossier: new Map() });
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(10);
    expect(screen.getByRole("heading", { name: /Page 3 sur 3/ })).toBeTruthy();
    await page.getByRole("combobox", { name: "Dossiers par page" }).click();
    expect(screen.getAllByRole("option").map((option) => option.textContent?.trim())).toEqual([
      "10",
      "25",
      "50",
      "100",
    ]);
    await page.getByRole("option", { name: "50", exact: true }).click();
    const params = await followNavigation();
    expect(params.get("page")).toBeNull();
    expect(params.get("pageSize")).toBe("50");
    expect(params.get("q")).toBe("Projet");
    expect(params.get("sort")).toBe("nextDueDate");
    expect(params.get("order")).toBe("asc");
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(50);
    expect(screen.getByRole("heading", { name: /Page 1 sur 2/ })).toBeTruthy();
    await page.getByRole("button", { name: "Page suivante" }).click();
    expect((await followNavigation()).get("pageSize")).toBe("50");
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(10);
    expect(screen.getByRole("heading", { name: /Page 2 sur 2/ })).toBeTruthy();
    await page.getByRole("combobox", { name: "Dossiers par page" }).click();
    await page.getByRole("option", { name: "100", exact: true }).click();
    await followNavigation();
    expect(screen.getAllByTestId("card-dossier")).toHaveLength(60);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  },
);

test("page-size selector remains available for an empty list on mobile", async () => {
  await page.viewport(390, 844);
  routeState.url = new URL("http://localhost/mes-dossiers?pageSize=50&page=99");
  render(ListDossiers, { title: "Dossiers", dossiers: [], notificationByDossier: new Map() });
  expect(screen.getByRole("heading", { name: "Page 1 sur 1" })).toBeTruthy();
  const selector = screen.getByRole("combobox", { name: "Dossiers par page" });
  expect(selector.textContent).toContain("50");
  expect(selector.getBoundingClientRect().right).toBeLessThanOrEqual(390);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
});
