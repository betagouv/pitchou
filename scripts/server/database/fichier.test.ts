import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../object-storage.ts", () => ({
  fileKey: (id: string) => `files/${id}`,
  putObject: vi.fn(),
  deleteObject: vi.fn(),
  getObject: vi.fn(),
}));

vi.mock("./file.ts", () => ({
  addFile: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
}));

import * as objectStorage from "../object-storage.ts";
import * as fileModule from "./file.ts";
import {
  loadFichierContent,
  stockerNouveauFichier,
  supprimerFichiersSansAutresRéférences,
} from "./fichier.js";
import { fakeDatabase } from "./fakeDatabase.js";

const putObject = vi.mocked(objectStorage.putObject);
const deleteObject = vi.mocked(objectStorage.deleteObject);
const addFile = vi.mocked(fileModule.addFile);
const deleteFile = vi.mocked(fileModule.deleteFile);

beforeEach(() => {
  putObject.mockReset();
  deleteObject.mockReset();
  addFile.mockReset();
  deleteFile.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("stockerNouveauFichier", () => {
  it("uploads to S3, then inserts file row, then inserts fichier shim, returning the fichier", async () => {
    putObject.mockResolvedValue();
    addFile.mockResolvedValue({});
    const db = fakeDatabase()
      .insertResolves([{ id: "fichier-1", nom: "f.pdf" }])
      .build();
    const contenu = Buffer.from("DATA");

    // @ts-ignore branded id
    const result = await stockerNouveauFichier(
      {
        nom: "f.pdf",
        contenu,
        media_type: "application/pdf",
        DS_checksum: "abc",
        DS_createdAt: new Date(0),
      },
      db.knex,
    );

    expect(putObject).toHaveBeenCalledTimes(1);
    expect(addFile).toHaveBeenCalledTimes(1);
    expect(deleteObject).not.toHaveBeenCalled();
    expect(result).toEqual({ id: "fichier-1", nom: "f.pdf" });

    const [putKey, putBody, putContentType] = putObject.mock.calls[0];
    expect(putKey).toMatch(/^files\//);
    expect(putBody).toBe(contenu);
    expect(putContentType).toBe("application/pdf");

    // The file row reuses the same UUID as the S3 key.
    const fileIdFromKey = putKey.slice("files/".length);
    expect(addFile.mock.calls[0][0]).toMatchObject({
      id: fileIdFromKey,
      nom: "f.pdf",
      media_type: "application/pdf",
      taille: String(contenu.byteLength),
    });

    // The fichier insert references the same file_id.
    expect(db.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nom: "f.pdf", file_id: fileIdFromKey }),
    );

    // putObject happens before addFile and the fichier insert.
    expect(putObject.mock.invocationCallOrder[0]).toBeLessThan(addFile.mock.invocationCallOrder[0]);
    expect(addFile.mock.invocationCallOrder[0]).toBeLessThan(db.insert.mock.invocationCallOrder[0]);
  });

  it("propagates S3 errors and skips DB inserts", async () => {
    putObject.mockRejectedValue(new Error("S3 down"));
    addFile.mockResolvedValue({});
    const db = fakeDatabase().build();

    await expect(
      stockerNouveauFichier({ nom: "f.pdf", contenu: Buffer.from(""), media_type: null }, db.knex),
    ).rejects.toThrow(/S3 down/);

    expect(addFile).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("deletes the S3 object when addFile rejects", async () => {
    putObject.mockResolvedValue();
    addFile.mockRejectedValue(new Error("file insert failed"));
    deleteObject.mockResolvedValue();
    const db = fakeDatabase().build();

    await expect(
      stockerNouveauFichier({ nom: "f.pdf", contenu: Buffer.from(""), media_type: null }, db.knex),
    ).rejects.toThrow(/file insert failed/);

    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject.mock.calls[0][0]).toBe(putObject.mock.calls[0][0]);
  });

  it("deletes the S3 object when the fichier insert rejects", async () => {
    putObject.mockResolvedValue();
    addFile.mockResolvedValue({});
    deleteObject.mockResolvedValue();
    const db = fakeDatabase().insertRejects(new Error("fichier insert failed")).build();

    await expect(
      stockerNouveauFichier({ nom: "f.pdf", contenu: Buffer.from(""), media_type: null }, db.knex),
    ).rejects.toThrow(/fichier insert failed/);

    expect(deleteObject).toHaveBeenCalledTimes(1);
  });
});

describe("loadFichierContent", () => {
  // The legacy-bytea, S3-stream and not-found branches are covered end-to-end
  // against a real DB + S3 in tests/integration/load-fichier-content.test.ts.
  // Only the "neither contenu nor file_id" edge case is unit-tested here.
  it("returns null when fichier has neither contenu nor file_id", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("fichier", [
        { id: "f-1", nom: "x.pdf", media_type: null, contenu: null, file_id: null },
      ])
      .build();
    // @ts-ignore branded id
    const result = await loadFichierContent("f-1", db.knex);
    expect(result).toBeNull();
  });
});

describe("supprimerFichiersSansAutresRéférences", () => {
  it("returns [] without queries when the input list is empty", async () => {
    const db = fakeDatabase().build();
    const result = await supprimerFichiersSansAutresRéférences([], db.knex);
    expect(result).toEqual([]);
    expect(db.table).not.toHaveBeenCalled();
  });

  it("deletes file + S3 for fichiers that are not referenced elsewhere", async () => {
    // No row references the fichiers in any of the FK tables.
    const db = fakeDatabase()
      .selectResolvesForTable("fichier", [{ file_id: "file-1" }])
      .build();
    deleteFile.mockResolvedValue(1);
    deleteObject.mockResolvedValue();

    // @ts-ignore branded id
    const result = await supprimerFichiersSansAutresRéférences(["fichier-1"], db.knex);

    expect(result).toEqual(["fichier-1"]);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.whereIn).toHaveBeenCalledWith("id", ["fichier-1"]);
    expect(deleteFile).toHaveBeenCalledWith("file-1", db.knex);
    expect(deleteObject).toHaveBeenCalledWith("files/file-1");
  });

  it("preserves fichiers still referenced by another table", async () => {
    // The fichier shows up in avis_expert.saisine_fichier.
    const db = fakeDatabase()
      .selectResolvesForTable("avis_expert", [{ saisine_fichier: "fichier-1" }])
      .build();

    // @ts-ignore branded id
    const result = await supprimerFichiersSansAutresRéférences(["fichier-1"], db.knex);

    expect(result).toEqual([]);
    expect(db.delete).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("skips S3 cleanup for legacy bytea fichiers (file_id IS NULL)", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("fichier", [{ file_id: null }])
      .build();

    // @ts-ignore branded id
    const result = await supprimerFichiersSansAutresRéférences(["fichier-legacy"], db.knex);

    expect(result).toEqual(["fichier-legacy"]);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(deleteFile).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("swallows errors from deleteObject (best-effort cleanup)", async () => {
    const db = fakeDatabase()
      .selectResolvesForTable("fichier", [{ file_id: "file-1" }])
      .build();
    deleteFile.mockResolvedValue(1);
    deleteObject.mockRejectedValue(new Error("S3 down"));
    // Silence the console.error from the source.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      // @ts-ignore branded id
      supprimerFichiersSansAutresRéférences(["fichier-1"], db.knex),
    ).resolves.toEqual(["fichier-1"]);

    expect(errSpy).toHaveBeenCalled();
  });
});
