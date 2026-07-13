import { parseDossiersQuery, type DossiersQuery, type DossiersContext } from "./dossiersList.ts";
import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
import type { PitchouState } from "$lib/state/store.svelte.ts";

/** Brands a raw number as a DossierId for the test fixtures */
export const dossierId = (n: number) => n as DossierRésumé["id"];

/** A valid query with all defaults, overridable field by field */
export function makeQuery(overrides: Partial<DossiersQuery> = {}): DossiersQuery {
  return { ...parseDossiersQuery(new URLSearchParams()), ...overrides };
}

export function makeDossier(overrides: Partial<DossierRésumé> = {}): DossierRésumé {
  return {
    id: dossierId(1),
    nom: "Dossier test",
    phase: "Instruction",
    date_dépôt: new Date("2024-01-01"),
    ...overrides,
  } as DossierRésumé;
}

export type Notification =
  PitchouState["notificationParDossier"] extends Map<infer _K, infer V> ? V : never;

export function makeContext(overrides: Partial<DossiersContext> = {}): DossiersContext {
  return {
    notificationParDossier: new Map<DossierRésumé["id"], Notification>(),
    ...overrides,
  };
}
