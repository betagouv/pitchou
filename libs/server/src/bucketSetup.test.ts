import { expect, test } from "vitest";

import { assertOrigins } from "./bucketSetup.ts";

test("assertOrigins accepte des origines http(s) nues", () => {
  expect(() =>
    assertOrigins(["https://pitchou.beta.gouv.fr", "http://localhost:5173"]),
  ).not.toThrow();
});

test.each([
  ["aucune origine", []],
  ["une barre finale", ["https://pitchou.beta.gouv.fr/"]],
  ["un chemin", ["https://pitchou.beta.gouv.fr/dossier"]],
  ["un hôte sans schéma", ["pitchou.beta.gouv.fr"]],
  ["un autre schéma", ["ftp://pitchou.beta.gouv.fr"]],
])("assertOrigins refuse %s", (_label, origins) => {
  expect(() => assertOrigins(origins)).toThrow(TypeError);
});
