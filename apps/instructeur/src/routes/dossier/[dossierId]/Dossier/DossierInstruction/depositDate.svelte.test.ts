import { afterEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "@testing-library/svelte";
import DossierInstruction from "../DossierInstruction.svelte";
import { store, type PitchouState } from "#lib/state/store.svelte.ts";
import { fakeDossierFull } from "../../../../fakeDossier.ts";
import { reactive } from "../../../../../../tests/helpers/reactive.svelte.ts";

afterEach(() => {
  cleanup();
  store.fullDossiers.clear();
  store.dossierSummaries.clear();
  store.capabilities = {};
});

test.each(["demarche_numerique", "pitchou", "onagre"] as const)(
  "sets and clears the DDEP date on a %s dossier",
  async (source) => {
    store.capabilities = {
      modifierDossier: vi.fn().mockResolvedValue(undefined),
    } as unknown as PitchouState["capabilities"];
    const dossier = reactive(fakeDossierFull({ source, depot_date: null }));
    const { rerender } = render(DossierInstruction, { dossier, email: "dates@pitchou.test" });
    const field = page.getByLabelText("Date de dépôt du DDEP", { exact: true });
    await field.fill("15/07/2026");
    await vi.waitFor(() => expect(store.capabilities.modifierDossier).toHaveBeenCalledOnce());
    const calls = vi.mocked(store.capabilities.modifierDossier!).mock.calls;
    expect(JSON.parse(JSON.stringify(calls[0][1]))).toEqual({ ddep_depot_date: "2026-07-15" });
    await rerender({ dossier: store.fullDossiers.get(dossier.id)!, email: "dates@pitchou.test" });
    await field.fill("");
    await vi.waitFor(() =>
      expect(store.capabilities.modifierDossier).toHaveBeenLastCalledWith(dossier.id, {
        ddep_depot_date: null,
      }),
    );
    expect(dossier.depot_date).toBeNull();
  },
);
