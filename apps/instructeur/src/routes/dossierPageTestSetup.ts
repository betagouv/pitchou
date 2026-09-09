/**
 * Shared setup for the component tests of the dossier page. The `vi.mock`
 * blocks stay in each test file — vitest hoists them per file — but the page
 * reads a lot of the store, so everything it may touch is reset in one place:
 * a test file clearing only the maps it thinks it uses leaks state into the
 * next test, with order-dependent failures that reproduce nowhere else.
 */

import { cleanup } from "@testing-library/svelte";
import { vi } from "vitest";

import { store, type PitchouState } from "$lib/state/store.svelte.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";

export function setupDossierPageState() {
  const modifierDossier = vi.fn().mockResolvedValue(undefined);
  const updateNotificationForDossier = vi.fn().mockResolvedValue(undefined);
  const actionsByDossier = new Map<DossierId, DossierAction[]>();
  store.followRelations = new Map();
  store.identité = { email: "instructeur@example.com" } as PitchouState["identité"];
  store.capabilities = {
    modifierDossier,
    updateNotificationForDossier,
    listerActionsDossier: vi.fn((id: DossierId) => Promise.resolve(actionsByDossier.get(id) ?? [])),
  } as unknown as PitchouState["capabilities"];
  return { modifierDossier, updateNotificationForDossier, actionsByDossier };
}

/** The props the dossier/[dossierId] route passes to its page. */
export function dossierPageProps(id: DossierId) {
  return {
    data: { dossierId: id, readOnly: false, fullWidth: true },
    params: { dossierId: String(id) },
  };
}

export function resetDossierPageState() {
  cleanup();
  vi.useRealTimers();
  store.fullDossiers.clear();
  store.readOnlyDossiers.clear();
  store.dossierSummaries.clear();
  store.notificationByDossier.clear();
  store.capabilities = {};
  store.identité = undefined;
}
