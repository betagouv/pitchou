import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("./fichier.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  deleteFichiersWithoutOtherReferences: vi.fn(),
}));

import { updateAvisExpert } from "./avis_expert.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { AvisExpertId } from "@pitchou/types/database/public/AvisExpert.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const aeId = "ae-1" as AvisExpertId;
const oldSaisine = "old-saisine" as FileId;
const oldAvis = "old-avis" as FileId;
const newSaisine = "new-saisine" as FileId;
const newAvis = "new-avis" as FileId;
const deleteFichiers = vi.mocked(deleteFichiersWithoutOtherReferences);

beforeEach(() => deleteFichiers.mockReset());

describe("updateAvisExpert", () => {
  it("cleans up the previous saisine fichier when it is replaced", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: oldSaisine, avis_fichier: null }])
      .build();
    await updateAvisExpert({ id: aeId, saisine_fichier: newSaisine }, db.knex);
    expect(deleteFichiers).toHaveBeenCalledWith([oldSaisine], db.knex);
  });

  it("cleans up both previous fichiers when both are replaced", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [
        { saisine_fichier: oldSaisine, avis_fichier: oldAvis },
      ])
      .build();
    await updateAvisExpert(
      { id: aeId, saisine_fichier: newSaisine, avis_fichier: newAvis },
      db.knex,
    );
    expect(deleteFichiers).toHaveBeenCalledWith([oldSaisine, oldAvis], db.knex);
  });

  it("does not clean files when fichier columns are untouched", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [
        { saisine_fichier: oldSaisine, avis_fichier: oldAvis },
      ])
      .build();
    await updateAvisExpert({ id: aeId, avis: "updated" }, db.knex);
    expect(deleteFichiers).not.toHaveBeenCalled();
  });
});
