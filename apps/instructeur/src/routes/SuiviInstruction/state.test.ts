import { describe, expect, test, vi } from "vitest";
import { SuiviInstructionState } from "./state.svelte.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

function dossier(id: number): DossierSummary {
  return {
    id: id as DossierSummary["id"],
    name: `Dossier ${id}`,
    phase: "Instruction",
    depot_date: new Date("2026-01-01"),
    phase_start_date: new Date("2026-01-01"),
  } as DossierSummary;
}

describe("SuiviInstructionState pagination", () => {
  test("keeps selectors stable and navigates through more than 40 dossiers", () => {
    const dossiers = Array.from({ length: 41 }, (_, index) => dossier(index + 1));
    const state = new SuiviInstructionState({
      email: "instructeur@example.com",
      dossiers,
      followRelations: undefined,
      activities: [],
      filters: {},
      remember: vi.fn(),
    });
    state.apply();

    const selectors = state.pageSelectors;
    expect(selectors).toBeDefined();
    expect(state.pageSelectors).toBe(selectors);
    expect(state.currentPage).toBe(selectors?.[1]);
    expect(state.displayed.map(({ id }) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );

    selectors?.[2]?.();

    expect(state.pageSelectors).toBe(selectors);
    expect(state.currentPage).toBe(selectors?.[2]);
    expect(state.displayed.map(({ id }) => id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 21),
    );

    selectors?.[3]?.();

    expect(state.currentPage).toBe(selectors?.[3]);
    expect(state.displayed.map(({ id }) => id)).toEqual([41]);
  });
});
