import { expect, test } from "vitest";
import { sanitizeInternalPath } from "./redirect.ts";

test("login destinations cannot become external through browser URL normalisation", () => {
  for (const value of [
    null,
    "https://other.example.fr",
    "//other.example.fr",
    "/\\other.example.fr",
    "/\n/other.example.fr",
    "/\t/other.example.fr",
  ])
    expect(sanitizeInternalPath(value)).toBe("/");
  expect(sanitizeInternalPath("/onagre?tab=correspondances")).toBe("/onagre?tab=correspondances");
});
