import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render, screen } from "@testing-library/svelte";

import DossierInstruction from "./DossierInstruction.svelte";
import { store } from "$lib/state/store.svelte.ts";
import { reactive } from "../../../../../tests/helpers/reactive.svelte.ts";

import type { PitchouState } from "$lib/state/store.svelte.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const DOSSIER_ID = 123 as DossierId;

/** A dossier as loaded from the server: the Onagre number is absent, so null. */
function fakeDossier(): DossierFull {
  return reactive({
    id: DOSSIER_ID,
    name: "Dossier test",
    enjeu: false,
    onagre_demande_identifier: null,
    ddep_required: null,
    er_mesures_sufficient: null,
    next_action_expected_from: null,
    next_action_expected: null,
    next_due_date: null,
    public_consultation_start_date: null,
    public_consultation_end_date: null,
    depot_date: new Date("2026-01-15"),
    evenementsPhase: [],
    // Saving refreshes the cached summary, which reads these collections.
    avisExpert: [],
    decisionsAdministratives: [],
    piecesJointesPetitionnaires: [],
    otherAttachments: [],
  } as unknown as DossierFull);
}

beforeEach(() => {
  store.capabilities = {
    modifierDossier: vi.fn().mockResolvedValue(undefined),
  } as unknown as PitchouState["capabilities"];
});

afterEach(() => {
  cleanup();
  store.capabilities = {};
});

test("afficher l'onglet instruction n'enregistre rien", async () => {
  render(DossierInstruction, { dossier: fakeDossier(), email: "instructeur@example.com" });

  await expect.element(screen.getByLabelText("N° de dossier Onagre")).toBeVisible();

  // Longer than the one-second debounce of the Onagre field, so a save queued
  // at mount would have landed by now.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  expect(store.capabilities.modifierDossier).not.toHaveBeenCalled();
  // The success alert belongs to a real save, not to opening the tab.
  expect(screen.queryByText("Le dossier a bien été mis à jour.")).toBeNull();
});

test("saisir un numéro Onagre enregistre le dossier", async () => {
  render(DossierInstruction, { dossier: fakeDossier(), email: "instructeur@example.com" });

  await page.getByLabelText("N° de dossier Onagre").fill("ONAGRE-98765");

  // The field is debounced by a second, so the save lands after typing.
  await vi.waitFor(
    () =>
      expect(store.capabilities.modifierDossier).toHaveBeenCalledWith(DOSSIER_ID, {
        onagre_demande_identifier: "ONAGRE-98765",
      }),
    { timeout: 5000 },
  );
});
