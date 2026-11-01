import { expect, test } from "vitest";
import { parseAccessLevel, parseGroupRules } from "./groupRouting.ts";

test("legacy rules default to instruction and explicit read rules retain their level", () => {
  const rule = { departments: ["75"], communes: [], activites: [] };
  expect(parseGroupRules([rule, { ...rule, accessLevel: "read" }])).toEqual([
    { ...rule, accessLevel: "instruct" },
    { ...rule, accessLevel: "read" },
  ]);
});

test.each([null, "lecture", "complet", "", false, 1])("rejects invalid grant level %j", (value) => {
  expect(() => parseAccessLevel(value)).toThrow("Niveau d'accès invalide");
  expect(() =>
    parseGroupRules([{ departments: ["75"], communes: [], activites: [], accessLevel: value }]),
  ).toThrow("Niveau d'accès invalide");
});

test("read rules still require at least one valid criterion", () => {
  expect(() =>
    parseGroupRules([{ departments: [], communes: [], activites: [], accessLevel: "read" }]),
  ).toThrow("au moins un critère");
  expect(parseAccessLevel()).toBe("instruct");
});
