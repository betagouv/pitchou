import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("./fichier.ts"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    stockerNouveauFichier: vi.fn(),
    supprimerFichiersSansAutresRéférences: vi.fn(),
  };
});

import {
  ajouterDécisionAdministrativeAvecFichier,
  modifierDécisionAdministrative,
  supprimerDécisionAdministrative,
} from "./décision_administrative.ts";
import { stockerNouveauFichier, supprimerFichiersSansAutresRéférences } from "./fichier.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { DCisionAdministrativeId } from "../../types/database/public/DécisionAdministrative.ts";
import type { DossierId } from "../../types/database/public/Dossier.ts";
import type { FichierId } from "../../types/database/public/Fichier.ts";

const daId = "da-1" as unknown as DCisionAdministrativeId;
const dossierId = "dossier-1" as unknown as DossierId;
const newFichierId = "new-fichier" as unknown as FichierId;
const oldFichierId = "old-fichier" as unknown as FichierId;
const fId = "f-1" as unknown as FichierId;

const stocker = vi.mocked(stockerNouveauFichier);
const supprimer = vi.mocked(supprimerFichiersSansAutresRéférences);

beforeEach(() => {
  stocker.mockReset();
  supprimer.mockReset();
});

describe("supprimerDécisionAdministrative", () => {
  it("filters the delete by the given id", async () => {
    const db = fakeDatabase().selectResolves([]).build();
    // @ts-ignore
    await supprimerDécisionAdministrative("some-id", db.knex);
    expect(db.where).toHaveBeenCalledWith({ id: "some-id" });
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("skips fichier cleanup when the décision had no attached fichier", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: null }])
      .build();
    // @ts-ignore
    await supprimerDécisionAdministrative("some-id", db.knex);
    expect(supprimerFichiersSansAutresRéférences).not.toHaveBeenCalled();
  });

  it("cleans up the attached fichier via supprimerFichiersSansAutresRéférences", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: fId }])
      .build();
    // @ts-ignore
    await supprimerDécisionAdministrative("some-id", db.knex);
    expect(supprimerFichiersSansAutresRéférences).toHaveBeenCalledWith([fId], db.knex);
  });
});

const baseDécision = {
  numéro: "1",
  type: "arrete-prefectoral",
  date_signature: new Date(0),
  date_fin_obligations: new Date(0),
  dossier: dossierId,
};

describe("ajouterDécisionAdministrativeAvecFichier", () => {
  it("inserts the décision without S3 calls when fichier_base64 is missing", async () => {
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();
    await ajouterDécisionAdministrativeAvecFichier(baseDécision, db.knex);
    expect(stocker).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ dossier: dossierId, numéro: "1" }),
    );
    // The inserted payload must not carry a fichier id.
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty("fichier");
  });

  it("uploads the base64 fichier and links its id on the décision row", async () => {
    stocker.mockResolvedValue({ id: fId });
    const db = fakeDatabase()
      .insertResolves([{ id: daId }])
      .build();

    await ajouterDécisionAdministrativeAvecFichier(
      {
        ...baseDécision,
        fichier_base64: {
          nom: "arrete.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("HELLO").toString("base64"),
        },
      },
      db.knex,
    );

    expect(stocker).toHaveBeenCalledTimes(1);
    const [stockerArg] = stocker.mock.calls[0];
    expect(stockerArg.nom).toBe("arrete.pdf");
    expect(stockerArg.media_type).toBe("application/pdf");
    expect(Buffer.isBuffer(stockerArg.contenu)).toBe(true);
    expect((stockerArg.contenu as Buffer).toString("utf8")).toBe("HELLO");

    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ fichier: fId }));
  });
});

describe("modifierDécisionAdministrative", () => {
  it("throws when id is missing", async () => {
    const db = fakeDatabase().build();
    await expect(
      modifierDécisionAdministrative({ ...baseDécision, id: undefined }, db.knex),
    ).rejects.toThrow(/id manquant/);
  });

  it("does not upload nor clean up when fichier_base64 is absent", async () => {
    const db = fakeDatabase().build();
    await modifierDécisionAdministrative({ ...baseDécision, id: daId }, db.knex);

    expect(stocker).not.toHaveBeenCalled();
    expect(supprimer).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("uploads the new fichier and deletes the previous one (best-effort cleanup)", async () => {
    stocker.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: oldFichierId }])
      .build();

    await modifierDécisionAdministrative(
      {
        ...baseDécision,
        id: daId,
        fichier_base64: {
          nom: "v2.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("NEW").toString("base64"),
        },
      },
      db.knex,
    );

    expect(stocker).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ fichier: newFichierId }));
    expect(supprimer).toHaveBeenCalledWith([oldFichierId], db.knex);
  });

  it("does not call supprimer when there was no previous fichier on the décision", async () => {
    stocker.mockResolvedValue({ id: newFichierId });
    const db = fakeDatabase()
      .selectResolvesForTable("décision_administrative", [{ fichier: null }])
      .build();

    await modifierDécisionAdministrative(
      {
        ...baseDécision,
        id: daId,
        fichier_base64: {
          nom: "v2.pdf",
          media_type: "application/pdf",
          contenuBase64: Buffer.from("NEW").toString("base64"),
        },
      },
      db.knex,
    );

    expect(supprimer).not.toHaveBeenCalled();
  });
});
