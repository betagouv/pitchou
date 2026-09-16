import { expect, test } from "vitest";
import { statutListeRougeLePlusMenace } from "./listeRouge.ts";

test("the most threatened national red-list category wins", () => {
  expect(statutListeRougeLePlusMenace(["NA", "VU"])).toBe("VU");
  expect(statutListeRougeLePlusMenace(["VU", "EN", "LC"])).toBe("EN");
  expect(statutListeRougeLePlusMenace(["EN", "CR", "VU"])).toBe("CR");
});

test("possibly extinct (CR*) counts as CR", () => {
  expect(statutListeRougeLePlusMenace(["CR*"])).toBe("CR");
});

test("non-threatened categories give no status", () => {
  expect(statutListeRougeLePlusMenace([])).toBeNull();
  expect(statutListeRougeLePlusMenace(["LC", "NT", "DD", "NA", "RE", "EX", ""])).toBeNull();
});
