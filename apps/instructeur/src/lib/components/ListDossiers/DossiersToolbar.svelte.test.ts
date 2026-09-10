import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../app.css";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import DossiersToolbar from "./DossiersToolbar.svelte";

afterEach(async () => {
  cleanup();
  await page.viewport(1280, 720);
});

function props(all: boolean) {
  return {
    title: all ? "Tous les dossiers" : "Mes dossiers",
    searchText: "",
    recentSearches: ["Renaturation"],
    showFilterInstructeurice: all,
    showFilterEnjeu: all,
    showFilterActionInstructeur: !all,
    showFilterUnread: !all,
    withoutInstructeurActive: false,
    enjeuActive: false,
    actionInstructeurActive: false,
    unreadActive: false,
    activeFilterCount: 0,
    numberFiltered: 12,
    localisation: "assigned" as const,
    chips: [],
    sortKey: "lastModified" as const,
    sortOrder: "asc" as const,
    onSearch: vi.fn(),
    onToggleWithoutInstructeur: vi.fn(),
    onToggleEnjeu: vi.fn(),
    onToggleActionInstructeur: vi.fn(),
    onToggleUnread: vi.fn(),
    onOpenFilters: vi.fn(),
    onRemoveFilter: vi.fn(),
    onSort: vi.fn(),
  };
}

test.each([false, true])("desktop search and all controls share one row, all=%s", async (all) => {
  await page.viewport(1440, 900);
  const { container, getByRole } = render(DossiersToolbar, props(all));
  container.className = "pitchou-container";
  await document.fonts.ready;
  const search = getByRole("search").getBoundingClientRect();
  expect(search.height).toBe(32);
  expect(getByRole("searchbox").getBoundingClientRect().height).toBe(32);
  const controls = container.querySelector(".dossiers-toolbar-controls")!;
  for (const button of controls.querySelectorAll("button")) {
    const box = button.getBoundingClientRect();
    expect(box.height).toBe(32);
    expect(getComputedStyle(button).borderTopRightRadius).toBe("4px");
    if (!button.closest("form")) expect(getComputedStyle(button).borderRadius).toBe("4px");
    expect(box.top + box.height / 2).toBe(search.top + search.height / 2);
  }
  expect(getByRole("heading", { level: 1 }).getBoundingClientRect().bottom).toBeLessThan(
    search.top,
  );
  expect(search.width).toBeGreaterThanOrEqual(192);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(1440);
});

test.each([390, 768])(
  "toolbar wraps without overflow at %ipx and preserves interactions",
  async (width) => {
    await page.viewport(width, 900);
    const callbacks = props(false);
    const view = render(DossiersToolbar, callbacks);
    view.container.className = "pitchou-container";
    await page.getByRole("searchbox", { name: "Rechercher un dossier" }).fill("Projet");
    expect(callbacks.onSearch).toHaveBeenLastCalledWith("Projet");
    await page.getByRole("option", { name: "Renaturation" }).click();
    expect(callbacks.onSearch).toHaveBeenLastCalledWith("Renaturation");
    await page.getByRole("button", { name: "Filtres", exact: true }).click();
    expect(callbacks.onOpenFilters).toHaveBeenCalledOnce();
    for (const button of view.container.querySelectorAll(".dossiers-toolbar-controls .fr-btn")) {
      expect(button.getBoundingClientRect().height).toBe(32);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  },
);
