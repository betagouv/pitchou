import { beforeEach, expect, test, vi } from "vitest";
import type { Knex } from "knex";
import type { DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import { findExistingFichiers, storeNewFichier } from "@pitchou/server/database/fichier.ts";
import downloadFichierDS from "./downloadFichierDS.ts";
import downloadNewFichiers from "./downloadNewFichiers.ts";

vi.mock("@pitchou/server/database/fichier.ts", () => ({
  findExistingFichiers: vi.fn(),
  makeFichierHash: (file: { name: string }) => file.name,
  storeNewFichier: vi.fn(),
}));
vi.mock("./downloadFichierDS.ts", () => ({ default: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

test("downloads overlap while file stores await the previous transaction write", async () => {
  const first = "00000000-0000-4000-8000-000000000001" as FileId;
  const second = "00000000-0000-4000-8000-000000000002" as FileId;
  const downloading = Promise.withResolvers<void>();
  const downloaded = Promise.withResolvers<{ content: ArrayBuffer; mediaType: null }>();
  const storing = Promise.withResolvers<void>();
  const stored = Promise.withResolvers<{ id: FileId }>();
  vi.mocked(findExistingFichiers).mockResolvedValue([]);
  vi.mocked(downloadFichierDS).mockImplementation(() => {
    if (vi.mocked(downloadFichierDS).mock.calls.length === 2) downloading.resolve();
    return downloaded.promise;
  });
  vi.mocked(storeNewFichier)
    .mockImplementationOnce(() => {
      storing.resolve();
      return stored.promise;
    })
    .mockResolvedValueOnce({ id: second });
  const files = ["first", "second"].map(
    (filename) =>
      ({
        filename,
        url: filename,
        contentType: "text/plain",
        checksum: filename,
        createdAt: "2026-01-01",
      }) as DSFile,
  );
  const trx = {} as Knex.Transaction;
  const synchronization = downloadNewFichiers(
    new Map([
      [101, [files[0]]],
      [102, [files[1]]],
    ]),
    trx,
  );
  try {
    await downloading.promise;
    expect(downloadFichierDS).toHaveBeenCalledTimes(2);
    expect(storeNewFichier).not.toHaveBeenCalled();
    downloaded.resolve({ content: new ArrayBuffer(1), mediaType: null });
    await storing.promise;
    expect(storeNewFichier).toHaveBeenCalledOnce();
  } finally {
    downloaded.resolve({ content: new ArrayBuffer(1), mediaType: null });
    stored.resolve({ id: first });
    await synchronization;
  }
  expect(await synchronization).toEqual(
    new Map([
      [101, [first]],
      [102, [second]],
    ]),
  );
  expect(vi.mocked(storeNewFichier).mock.calls.map(([, transaction]) => transaction)).toEqual([
    trx,
    trx,
  ]);
});

test("the next download batch waits for the buffered batch to finish storing", async () => {
  const id = "00000000-0000-4000-8000-000000000001" as FileId;
  const storing = Promise.withResolvers<void>();
  const stored = Promise.withResolvers<{ id: FileId }>();
  vi.mocked(findExistingFichiers).mockResolvedValue([]);
  vi.mocked(downloadFichierDS).mockResolvedValue({ content: new ArrayBuffer(1), mediaType: null });
  vi.mocked(storeNewFichier)
    .mockResolvedValue({ id })
    .mockImplementationOnce(() => {
      storing.resolve();
      return stored.promise;
    });
  const files = Array.from(
    { length: 6 },
    (_, index) =>
      ({
        filename: String(index),
        url: String(index),
        contentType: "text/plain",
        checksum: String(index),
        createdAt: "2026-01-01",
      }) as DSFile,
  );
  const synchronization = downloadNewFichiers(new Map([[101, files]]), {} as Knex.Transaction);
  try {
    await storing.promise;
    expect(downloadFichierDS).toHaveBeenCalledTimes(5);
    expect(storeNewFichier).toHaveBeenCalledOnce();
  } finally {
    stored.resolve({ id });
    await synchronization;
  }
  expect(downloadFichierDS).toHaveBeenCalledTimes(6);
  expect(storeNewFichier).toHaveBeenCalledTimes(6);
});
