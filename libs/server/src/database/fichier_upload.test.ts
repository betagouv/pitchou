import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("../objectStorage.ts"), () => ({
  fileKey: (id: string) => `files/${id}`,
  pendingKey: (id: string) => `pending/${id}`,
  headObject: vi.fn(),
  copyObject: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock(import("./file.ts"), () => ({
  addFile: vi.fn(),
}));

import * as objectStorage from "../objectStorage.ts";
import * as fileModule from "./file.ts";
import { registerUploadedFichier, UploadedFichierError } from "./fichier_upload.ts";
import { fakeDatabase } from "./fakeDatabase.js";
import type { FileId } from "@pitchou/types/database/public/File.ts";

const headObject = vi.mocked(objectStorage.headObject);
const copyObject = vi.mocked(objectStorage.copyObject);
const deleteObject = vi.mocked(objectStorage.deleteObject);
const addFile = vi.mocked(fileModule.addFile);

const id = "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70" as FileId;
const upload = { id, name: "arrete.pdf" };

beforeEach(() => {
  headObject.mockReset();
  copyObject.mockReset().mockResolvedValue();
  deleteObject.mockReset().mockResolvedValue();
  addFile.mockReset();
  delete process.env.MAX_UPLOAD_SIZE;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerUploadedFichier", () => {
  it("copies the pending object under files/, inserts the row, then drops the pending object", async () => {
    headObject.mockResolvedValue({ contentLength: 12, contentType: "application/pdf" });
    addFile.mockResolvedValue({ id, name: "arrete.pdf" });
    const db = fakeDatabase().build();

    const result = await registerUploadedFichier(upload, db.knex);

    expect(headObject).toHaveBeenCalledWith(`pending/${id}`);
    expect(copyObject).toHaveBeenCalledWith(`pending/${id}`, `files/${id}`);
    expect(addFile).toHaveBeenCalledWith(
      { id, name: "arrete.pdf", media_type: "application/pdf", size: "12" },
      db.knex,
    );
    expect(deleteObject).toHaveBeenCalledWith(`pending/${id}`);
    expect(result).toEqual({ id, name: "arrete.pdf" });
    // The insert must be done before the pending object goes away.
    expect(addFile.mock.invocationCallOrder[0]).toBeLessThan(
      deleteObject.mock.invocationCallOrder[0],
    );
  });

  it("stores a null media type when storage only has its default content type", async () => {
    headObject.mockResolvedValue({ contentLength: 3, contentType: "binary/octet-stream" });
    addFile.mockResolvedValue({ id });

    await registerUploadedFichier(upload, fakeDatabase().build().knex);

    expect(addFile).toHaveBeenCalledWith(
      expect.objectContaining({ media_type: null }),
      expect.anything(),
    );
  });

  it("rejects an id that is not a UUID without touching storage", async () => {
    await expect(
      registerUploadedFichier(
        { id: "../files/x" as FileId, name: "x" },
        fakeDatabase().build().knex,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(headObject).not.toHaveBeenCalled();
  });

  it("fails with not_found when the browser never sent the object", async () => {
    headObject.mockResolvedValue(null);

    await expect(
      registerUploadedFichier(upload, fakeDatabase().build().knex),
    ).rejects.toBeInstanceOf(UploadedFichierError);
    expect(copyObject).not.toHaveBeenCalled();
    expect(addFile).not.toHaveBeenCalled();
  });

  it("refuses and discards an object above the size limit", async () => {
    process.env.MAX_UPLOAD_SIZE = "10";
    headObject.mockResolvedValue({ contentLength: 11 });

    await expect(
      registerUploadedFichier(upload, fakeDatabase().build().knex),
    ).rejects.toMatchObject({
      code: "too_large",
    });
    expect(deleteObject).toHaveBeenCalledWith(`pending/${id}`);
    expect(copyObject).not.toHaveBeenCalled();
  });

  it("deletes the copied object when the row insert fails, and keeps the pending one", async () => {
    headObject.mockResolvedValue({ contentLength: 1 });
    addFile.mockRejectedValue(new Error("db down"));

    await expect(registerUploadedFichier(upload, fakeDatabase().build().knex)).rejects.toThrow(
      "db down",
    );
    expect(deleteObject).toHaveBeenCalledTimes(1);
    expect(deleteObject).toHaveBeenCalledWith(`files/${id}`);
  });

  it("still succeeds when dropping the pending object fails", async () => {
    headObject.mockResolvedValue({ contentLength: 1 });
    addFile.mockResolvedValue({ id });
    deleteObject.mockRejectedValue(new Error("S3 unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(registerUploadedFichier(upload, fakeDatabase().build().knex)).resolves.toEqual({
      id,
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
