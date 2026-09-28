import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock(import("./objectStorage.ts"), () => ({
  pendingKey: (id: string) => `pending/${id}`,
  createUploadUrl: vi.fn(async (key: string) => `https://storage/${key}?signed`),
}));

import {
  createUploadUrls,
  getMaxUploadSizeBytes,
  parseSizeLimit,
  parseUploadedFichier,
  parseUploadedFichiers,
  parseUploadSizes,
  UploadedFichierError,
} from "./upload.ts";

const id = "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70";

afterEach(() => {
  delete process.env.MAX_UPLOAD_SIZE;
});

test("parseSizeLimit gère les suffixes K/M/G", () => {
  expect(parseSizeLimit("512K")).toBe(512 * 1024);
  expect(parseSizeLimit("200M")).toBe(200 * 1024 * 1024);
  expect(parseSizeLimit("1G")).toBe(1024 * 1024 * 1024);
});

test("parseSizeLimit accepte les suffixes en minuscules", () => {
  expect(parseSizeLimit("200m")).toBe(200 * 1024 * 1024);
});

test("parseSizeLimit gère une valeur en octets sans suffixe", () => {
  expect(parseSizeLimit("1048576")).toBe(1048576);
});

test("parseSizeLimit gère Infinity", () => {
  expect(parseSizeLimit("Infinity")).toBe(Infinity);
});

test("getMaxUploadSizeBytes vaut 1 Go par défaut, y compris pour une valeur vide", () => {
  expect(getMaxUploadSizeBytes()).toBe(1024 * 1024 * 1024);
  process.env.MAX_UPLOAD_SIZE = "";
  expect(getMaxUploadSizeBytes()).toBe(1024 * 1024 * 1024);
});

test("getMaxUploadSizeBytes lit MAX_UPLOAD_SIZE", () => {
  process.env.MAX_UPLOAD_SIZE = "50M";
  expect(getMaxUploadSizeBytes()).toBe(50 * 1024 * 1024);
});

describe("parseUploadedFichier", () => {
  test("accepte une référence bien formée et l'absence de fichier", () => {
    expect(parseUploadedFichier({ id, name: "a.pdf" }, "f")).toEqual({ id, name: "a.pdf" });
    expect(parseUploadedFichier(undefined, "f")).toBeUndefined();
    expect(parseUploadedFichier(null, "f")).toBeUndefined();
  });

  test.each([
    ["une chaîne", "x"],
    ["un identifiant qui n'est pas un UUID", { id: "../files/x", name: "a" }],
    ["un nom vide", { id, name: " " }],
    ["une propriété inconnue", { id, name: "a", size: 1 }],
  ])("refuse %s", (_label, value) => {
    expect(() => parseUploadedFichier(value, "f")).toThrow(UploadedFichierError);
  });

  test("parseUploadedFichiers refuse un élément nul dans la liste", () => {
    expect(parseUploadedFichiers([{ id, name: "a" }], "files")).toHaveLength(1);
    expect(parseUploadedFichiers(undefined, "files")).toEqual([]);
    expect(() => parseUploadedFichiers([null], "files")).toThrow(/files\[0\]/);
    expect(() => parseUploadedFichiers("x", "files")).toThrow(/liste/);
  });
});

describe("parseUploadSizes", () => {
  test("renvoie les tailles", () => {
    expect(parseUploadSizes([{ size: 1 }, { size: 2 }])).toEqual([1, 2]);
  });

  test.each([
    ["une liste vide", []],
    ["une taille nulle", [{ size: 0 }]],
    ["une taille non entière", [{ size: 1.5 }]],
    ["une propriété inconnue", [{ size: 1, name: "x" }]],
    ["trop de fichiers", Array.from({ length: 21 }, () => ({ size: 1 }))],
  ])("refuse %s avec un 400", (_label, files) => {
    expect(() => parseUploadSizes(files)).toThrow(expect.objectContaining({ status: 400 }));
  });

  test("refuse un fichier au-delà de la limite avec un 413", () => {
    process.env.MAX_UPLOAD_SIZE = "10";
    expect(() => parseUploadSizes([{ size: 11 }])).toThrow(
      expect.objectContaining({ status: 413 }),
    );
  });
});

test("createUploadUrls signe une URL pending/ distincte par fichier", async () => {
  const urls = await createUploadUrls([1, 2]);
  expect(urls).toHaveLength(2);
  expect(urls[0].id).not.toBe(urls[1].id);
  expect(urls[0].url).toBe(`https://storage/pending/${urls[0].id}?signed`);
});
