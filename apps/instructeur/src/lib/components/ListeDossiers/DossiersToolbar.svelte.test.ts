import { expect, test, vi } from "vitest";
import { render, fireEvent } from "@testing-library/svelte";

import DossiersToolbar from "./DossiersToolbar.svelte";
import { parseDossiersQuery } from "./dossiersList.ts";

function renderToolbar(overrides: Record<string, unknown> = {}) {
  const props = {
    query: parseDossiersQuery(new URLSearchParams()),
    availableActivites: [],
    availableDepartements: [],
    availableInstructeurs: [],
    showInstructeurFilter: false,
    showActionInstructeurFilter: false,
    statusMessage: "",
    onSearchInput: vi.fn(),
    onSearchCommit: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    ...overrides,
  };
  const result = render(DossiersToolbar, props);
  const input = result.container.querySelector("#search-input") as HTMLInputElement;
  return { ...result, props, input };
}

test("the search box reflects the URL query text", () => {
  const { input } = renderToolbar({
    query: parseDossiersQuery(new URLSearchParams({ q: "héron" })),
  });
  expect(input.value).toBe("héron");
});

test("typing only fires the live callback, never the analytics one", async () => {
  const { input, props } = renderToolbar();

  await fireEvent.input(input, { target: { value: "photovoltaïque" } });

  expect(props.onSearchInput).toHaveBeenCalledWith("photovoltaïque");
  expect(props.onSearchCommit).not.toHaveBeenCalled();
});

test("committing the search (change on blur / Enter) fires the analytics callback", async () => {
  const { input, props } = renderToolbar();

  await fireEvent.input(input, { target: { value: "photovoltaïque" } });
  await fireEvent.change(input, { target: { value: "photovoltaïque" } });

  expect(props.onSearchCommit).toHaveBeenCalledWith("photovoltaïque");
});
