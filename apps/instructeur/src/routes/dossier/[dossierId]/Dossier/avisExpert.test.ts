import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock(import("$lib/upload/uploadToStorage.ts"), () => ({
  uploadFichiers: vi.fn(),
}));

import { store, type PitchouState } from "$lib/state/store.svelte.ts";
import { uploadFichiers } from "$lib/upload/uploadToStorage.ts";
import { addOrUpdateAvisExpert } from "./avisExpert.ts";

const addOrUpdateAvisExpertCapability = vi.fn().mockResolvedValue("avis-expert-1");

beforeEach(() => {
  addOrUpdateAvisExpertCapability.mockClear();
  vi.mocked(uploadFichiers).mockReset();
  store.capabilities = {
    addOrUpdateAvisExpert: addOrUpdateAvisExpertCapability,
  } as unknown as PitchouState["capabilities"];
});

afterEach(() => {
  store.capabilities = {};
});

test("updates an avis when the saisine date received from the API is a string", async () => {
  await addOrUpdateAvisExpert({
    id: "avis-expert-1",
    dossier: 1,
    saisine_date: "2026-06-01",
    avis_date: new Date("2026-07-15"),
  } as unknown as Parameters<typeof addOrUpdateAvisExpert>[0]);

  expect(addOrUpdateAvisExpertCapability).toHaveBeenCalledWith({
    id: "avis-expert-1",
    dossier: 1,
    saisine_date: "2026-06-01",
    avis_date: new Date("2026-07-15"),
  });
  expect(uploadFichiers).not.toHaveBeenCalled();
});

test("sends the files to storage first, then references them on the avis", async () => {
  const saisine = new File(["S"], "saisine.pdf", { type: "application/pdf" });
  const avis = new File(["A"], "avis.pdf", { type: "application/pdf" });
  vi.mocked(uploadFichiers).mockResolvedValue([
    { id: "id-saisine" as never, name: "saisine.pdf" },
    { id: "id-avis" as never, name: "avis.pdf" },
  ]);

  await addOrUpdateAvisExpert({ dossier: 1, expert: "CNPN" } as never, saisine, avis);

  expect(uploadFichiers).toHaveBeenCalledWith(1, [saisine, avis]);
  expect(addOrUpdateAvisExpertCapability).toHaveBeenCalledWith({
    dossier: 1,
    expert: "CNPN",
    saisine_fichier_upload: { id: "id-saisine", name: "saisine.pdf" },
    avis_fichier_upload: { id: "id-avis", name: "avis.pdf" },
  });
});

test("maps a lone avis file to avis_fichier_upload, leaving the saisine untouched", async () => {
  const avis = new File(["A"], "avis.pdf", { type: "application/pdf" });
  vi.mocked(uploadFichiers).mockResolvedValue([{ id: "id-avis" as never, name: "avis.pdf" }]);

  await addOrUpdateAvisExpert({ dossier: 1 } as never, undefined, avis);

  expect(uploadFichiers).toHaveBeenCalledWith(1, [avis]);
  expect(addOrUpdateAvisExpertCapability).toHaveBeenCalledWith({
    dossier: 1,
    avis_fichier_upload: { id: "id-avis", name: "avis.pdf" },
  });
});
