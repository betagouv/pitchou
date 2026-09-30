import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("./fichier.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    deleteFichiersWithoutOtherReferences: vi.fn(),
  };
});
vi.mock(import("./fichier_upload.ts"), async (importOriginal) => ({
  ...(await importOriginal()),
  registerUploadedFichier: vi.fn(),
}));

import {
  addDecisionAdministrativeWithFichier,
  updateDecisionAdministrative,
  deleteDecisionAdministrative,
} from "./decision_administrative.ts";
import { deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { registerUploadedFichier } from "./fichier_upload.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const daId = "da-1" as unknown as DecisionAdministrativeId;
const dossierId = 1 as DossierId;
const newFichierId = "new-fichier" as unknown as FileId;
const oldFichierId = "old-fichier" as unknown as FileId;
const fId = "f-1" as unknown as FileId;

const registerFichier = vi.mocked(registerUploadedFichier);
const deleteFichiers = vi.mocked(deleteFichiersWithoutOtherReferences);

beforeEach(() => {
  registerFichier.mockReset();
  deleteFichiers.mockReset();
});

describe("deleteDecisionAdministrative", () => {
  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    // @ts-ignore
    await deleteDecisionAdministrative("some-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "some-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("skips fichier cleanup when the décision had no attached fichier", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("decision_administrative", [{ fichier: null }])
      .build();
    // @ts-ignore
    await deleteDecisionAdministrative("some-id", db.knex);
    expect(deleteFichiersWithoutOtherReferences).not.toHaveBeenCalled();
  });

  it("cleans up the attached fichier via deleteFichiersWithoutOtherReferences", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("decision_administrative", [{ fichier: fId }])
      .build();
    // @ts-ignore
    await deleteDecisionAdministrative("some-id", db.knex);
    expect(deleteFichiersWithoutOtherReferences).toHaveBeenCalledWith([fId], db.knex);
  });
});

const baseDecision = {
  number: "1",
  type: "arrete-prefectoral",
  signature_date: new Date(0),
  obligations_end_date: new Date(0),
  dossier: dossierId,
};

describe("addDecisionAdministrativeWithFichier", () => {
  it("inserts the décision without S3 calls when fichier_upload is missing", async () => {
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();
    await addDecisionAdministrativeWithFichier(baseDecision, db.knex);
    expect(registerFichier).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dossier: dossierId, number: "1" }),
    );
    // The inserted payload must not carry a fichier id.
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty("fichier");
  });

  it("registers the uploaded fichier and links its id on the décision row", async () => {
    registerFichier.mockResolvedValue({ id: fId });
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();

    await addDecisionAdministrativeWithFichier(
      {
        ...baseDecision,
        fichier_upload: { id: fId, name: "arrete.pdf" },
      },
      db.knex,
    );

    expect(registerFichier).toHaveBeenCalledTimes(1);
    expect(registerFichier).toHaveBeenCalledWith({ id: fId, name: "arrete.pdf" }, db.knex);

    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ fichier: fId }));
  });
});

describe("updateDecisionAdministrative", () => {
  const decisionWithFile = {
    ...baseDecision,
    id: daId,
    fichier_upload: { id: newFichierId, name: "v2.pdf" },
  };

  it("throws when id is missing", async () => {
    const db = fakeDatabase().build();
    await expect(
      updateDecisionAdministrative({ ...baseDecision, id: undefined }, db.knex),
    ).rejects.toThrow(/id manquant/);
  });

  it("does not upload nor clean up when fichier_upload is absent", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("decision_administrative", [{ dossier: dossierId }])
      .build();
    const updateWhere = vi.fn().mockResolvedValue(1);
    db.update.mockReturnValueOnce(Object.assign(Promise.resolve(1), { where: updateWhere }));
    await updateDecisionAdministrative({ ...baseDecision, id: daId }, db.knex);

    expect(registerFichier).not.toHaveBeenCalled();
    expect(deleteFichiers).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update.mock.calls[0][0]).not.toHaveProperty("dossier");
    expect(updateWhere).toHaveBeenCalledWith({ id: daId, dossier: dossierId });
  });

  it.each([2, undefined])(
    "rejects a mismatched or missing stored dossier before uploading: %s",
    async (storedDossier) => {
      registerFichier.mockResolvedValue({ id: newFichierId });
      const db = fakeDatabase()
        .selectResolvesForTable(
          "decision_administrative",
          storedDossier === undefined ? [] : [{ dossier: storedDossier, fichier: oldFichierId }],
        )
        .build();

      await expect(updateDecisionAdministrative(decisionWithFile, db.knex)).rejects.toThrow(
        "La décision administrative n'appartient pas au dossier",
      );

      expect(db.where).toHaveBeenCalledWith({ id: daId });
      expect(registerFichier).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
      expect(deleteFichiers).not.toHaveBeenCalled();
    },
  );

  it("uploads the new fichier and deletes the previous one (best-effort cleanup)", async () => {
    registerFichier.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("decision_administrative", [
        { dossier: dossierId, fichier: oldFichierId },
      ])
      .build();

    await updateDecisionAdministrative(decisionWithFile, db.knex);

    expect(registerFichier).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ fichier: newFichierId }));
    expect(db.where).toHaveBeenLastCalledWith({ id: daId, dossier: dossierId });
    expect(deleteFichiers).toHaveBeenCalledWith([oldFichierId], db.knex);
  });

  it("does not call deleteFichiers when there was no previous fichier on the décision", async () => {
    registerFichier.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("decision_administrative", [{ dossier: dossierId, fichier: null }])
      .build();

    await updateDecisionAdministrative(decisionWithFile, db.knex);

    expect(deleteFichiers).not.toHaveBeenCalled();
  });
});
