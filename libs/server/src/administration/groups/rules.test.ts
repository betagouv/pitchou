import { expect, test } from "vitest";
import { splitRules } from "./rules.ts";

test("department-only read rules cannot enter the legacy instruction department table", () => {
  const read = { departments: ["75"], communes: [], activites: [], accessLevel: "read" as const };
  const legacy = { departments: ["69"], communes: [], activites: [] };
  expect(splitRules([read, legacy])).toEqual({ departments: ["69"], conditional: [read] });
});
