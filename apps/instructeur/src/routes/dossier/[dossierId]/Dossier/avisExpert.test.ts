import { afterEach, expect, test, vi } from "vitest";

import { store, type PitchouState } from "$lib/state/store.svelte.ts";
import { addOrUpdateAvisExpert } from "./avisExpert.ts";

afterEach(() => {
  store.capabilities = {};
});

test("updates an avis when the saisine date received from the API is a string", async () => {
  const addOrUpdateAvisExpertCapability = vi.fn().mockResolvedValue("avis-expert-1");
  store.capabilities = {
    addOrUpdateAvisExpert: addOrUpdateAvisExpertCapability,
  } as unknown as PitchouState["capabilities"];

  await addOrUpdateAvisExpert({
    id: "avis-expert-1",
    dossier: 1,
    saisine_date: "2026-06-01",
    avis_date: new Date("2026-07-15"),
  } as unknown as Parameters<typeof addOrUpdateAvisExpert>[0]);

  const form = addOrUpdateAvisExpertCapability.mock.calls[0][0] as FormData;
  expect(form.get("saisine_date")).toBe("2026-06-01");
  expect(form.get("avis_date")).toBe("2026-07-15T00:00:00.000Z");
});
