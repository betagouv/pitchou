import { expect, test } from "vitest";

import { parseBodySizeLimit } from "./uploadLimit.ts";

test("parseBodySizeLimit gère les suffixes K/M/G", () => {
  expect(parseBodySizeLimit("512K")).toBe(512 * 1024);
  expect(parseBodySizeLimit("200M")).toBe(200 * 1024 * 1024);
  expect(parseBodySizeLimit("1G")).toBe(1024 * 1024 * 1024);
});

test("parseBodySizeLimit accepte les suffixes en minuscules", () => {
  expect(parseBodySizeLimit("200m")).toBe(200 * 1024 * 1024);
});

test("parseBodySizeLimit gère une valeur en octets sans suffixe", () => {
  expect(parseBodySizeLimit("1048576")).toBe(1048576);
});

test("parseBodySizeLimit gère Infinity", () => {
  expect(parseBodySizeLimit("Infinity")).toBe(Infinity);
});
