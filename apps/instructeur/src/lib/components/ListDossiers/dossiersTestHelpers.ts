import { parseDossiersQuery, type DossiersQuery, type DossiersContext } from "./dossiersList.ts";
import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";

/** Brands a raw number as a DossierId for the test fixtures */
export const dossierId = (n: number) => n as DossierSummary["id"];

/** A valid query with all defaults, overridable field by field */
export function makeQuery(overrides: Partial<DossiersQuery> = {}): DossiersQuery {
  return { ...parseDossiersQuery(new URLSearchParams()), ...overrides };
}

export function makeDossier(overrides: Partial<DossierSummary> = {}): DossierSummary {
  return {
    id: dossierId(1),
    name: "Dossier test",
    phase: "Instruction",
    depot_date: new Date("2024-01-01"),
    ...overrides,
  } as DossierSummary;
}

export type Notification =
  PitchouState["notificationByDossier"] extends Map<infer _K, infer V> ? V : never;

export function makeContext(overrides: Partial<DossiersContext> = {}): DossiersContext {
  return {
    notificationByDossier: new Map<DossierSummary["id"], Notification>(),
    ...overrides,
  };
}
