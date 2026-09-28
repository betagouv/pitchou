import { afterEach, expect, test } from "vitest";

import { getMaxUploadSizeBytes, parseSizeLimit } from "./uploadLimit.ts";

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

test("getMaxUploadSizeBytes vaut 1 Go par défaut", () => {
  expect(getMaxUploadSizeBytes()).toBe(1024 * 1024 * 1024);
});

test("getMaxUploadSizeBytes lit MAX_UPLOAD_SIZE", () => {
  process.env.MAX_UPLOAD_SIZE = "50M";
  expect(getMaxUploadSizeBytes()).toBe(50 * 1024 * 1024);
});
