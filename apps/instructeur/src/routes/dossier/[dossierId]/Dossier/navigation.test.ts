import { expect, test } from "vitest";
import { dossierReturnPath } from "./navigation.ts";

test("retains list filters and hash, never a dossier or an external destination", () => {
  const origin = "https://pitchou.test";
  expect(dossierReturnPath(`${origin}/mes-dossiers?recherche=abc#results`, origin)).toBe(
    "/mes-dossiers?recherche=abc#results",
  );
  expect(dossierReturnPath("/tous-les-dossiers", origin)).toBe("/tous-les-dossiers");
  for (const value of [
    undefined,
    "http://[",
    "//other.test/mes-dossiers",
    "/dossier/1",
    "/dossier/1?lecture=1",
    "/connexion",
  ]) {
    expect(dossierReturnPath(value, origin)).toBeUndefined();
  }
});
