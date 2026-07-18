import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("./fichier.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    storeNewFichier: vi.fn(),
    deleteFichiersWithoutOtherReferences: vi.fn(),
  };
});

import {
  addDecisionAdministrativeWithFichier,
  updateDecisionAdministrative,
  deleteDecisionAdministrative,
} from "./decision_administrative.ts";
import { storeNewFichier, deleteFichiersWithoutOtherReferences } from "./fichier.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { DecisionAdministrativeId } from "@pitchou/types/database/public/DecisionAdministrative.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const daId = "da-1" as unknown as DecisionAdministrativeId;
const dossierId = "dossier-1" as unknown as DossierId;
const newFichierId = "new-fichier" as unknown as FileId;
const oldFichierId = "old-fichier" as unknown as FileId;
const fId = "f-1" as unknown as FileId;

const storeFichier = vi.mocked(storeNewFichier);
const deleteFichiers = vi.mocked(deleteFichiersWithoutOtherReferences);

beforeEach(() => {
  storeFichier.mockReset();
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
      .selectResolvesForTable("décision_administrative", [{ fichier: null }])
      .build();
    // @ts-ignore
    await deleteDecisionAdministrative("some-id", db.knex);
    expect(deleteFichiersWithoutOtherReferences).not.toHaveBeenCalled();
  });

  it("cleans up the attached fichier via deleteFichiersWithoutOtherReferences", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: fId }])
      .build();
    // @ts-ignore
    await deleteDecisionAdministrative("some-id", db.knex);
    expect(deleteFichiersWithoutOtherReferences).toHaveBeenCalledWith([fId], db.knex);
  });
});

const baseDecision = {
  numéro: "1",
  type: "arrete-prefectoral",
  date_signature: new Date(0),
  date_fin_obligations: new Date(0),
  dossier: dossierId,
};

describe("addDecisionAdministrativeWithFichier", () => {
  it("inserts the décision without S3 calls when fichier_base64 is missing", async () => {
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();
    await addDecisionAdministrativeWithFichier(baseDecision, db.knex);
    expect(storeFichier).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dossier: dossierId, numéro: "1" }),
    );
    // The inserted payload must not carry a fichier id.
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty("fichier");
  });

  it("uploads the base64 fichier and links its id on the décision row", async () => {
    storeFichier.mockResolvedValue({ id: fId });
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();

    await addDecisionAdministrativeWithFichier(
      {
        ...baseDecision,
        fichier_base64: {
          nom: "arrete.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("HELLO").toString("base64"),
        },
      },
      db.knex,
    );

    expect(storeFichier).toHaveBeenCalledTimes(1);
    const [storeArg] = storeFichier.mock.calls[0];
    expect(storeArg.nom).toBe("arrete.pdf");
    expect(storeArg.media_type).toBe("application/pdf");
    expect(Buffer.isBuffer(storeArg.contenu)).toBe(true);
    expect((storeArg.contenu as Buffer).toString("utf8")).toBe("HELLO");

    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ fichier: fId }));
  });
});

describe("updateDecisionAdministrative", () => {
  it("throws when id is missing", async () => {
    const db = fakeDatabase().build();
    await expect(
      updateDecisionAdministrative({ ...baseDecision, id: undefined }, db.knex),
    ).rejects.toThrow(/id manquant/);
  });

  it("does not upload nor clean up when fichier_base64 is absent", async () => {
    const db = fakeDatabase().build();
    await updateDecisionAdministrative({ ...baseDecision, id: daId }, db.knex);

    expect(storeFichier).not.toHaveBeenCalled();
    expect(deleteFichiers).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("uploads the new fichier and deletes the previous one (best-effort cleanup)", async () => {
    storeFichier.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: oldFichierId }])
      .build();

    await updateDecisionAdministrative(
      {
        ...baseDecision,
        id: daId,
        fichier_base64: {
          nom: "v2.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("NEW").toString("base64"),
        },
      },
      db.knex,
    );

    expect(storeFichier).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ fichier: newFichierId }));
    expect(deleteFichiers).toHaveBeenCalledWith([oldFichierId], db.knex);
  });

  it("does not call deleteFichiers when there was no previous fichier on the décision", async () => {
    storeFichier.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: null }])
      .build();

    await updateDecisionAdministrative(
      {
        ...baseDecision,
        id: daId,
        fichier_base64: {
          nom: "v2.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("NEW").toString("base64"),
        },
      },
      db.knex,
    );

    expect(deleteFichiers).not.toHaveBeenCalled();
  });
});
