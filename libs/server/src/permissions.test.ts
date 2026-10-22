import { expect, test } from "vitest";
import { effectivePermissions } from "@pitchou/types/permissions.ts";
test("exclusions override both bundle permissions and direct grants", () => {
  expect(
    effectivePermissions(
      ["instructeur"],
      ["groups:manage", "dossier:instruct"],
      ["dossier:instruct"],
    ),
  ).toEqual(["dossier:read", "groups:manage"]);
});
test("unknown permissions and bundles grant nothing", () => {
  expect(effectivePermissions(["unknown", "__proto__"], ["unknown", "toString"], [])).toEqual([]);
});
