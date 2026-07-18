import { describe, it, expect } from "vitest";
import { removeAccents } from "@pitchou/common/stringManipulation.ts";

// Smoke test: proves the unit runner works and the shared lib the home
// page relies on behaves as expected.
describe("@pitchou/common", () => {
  it("strips accents from domain strings", () => {
    expect(removeAccents("Dérogation espèces protégées")).toBe("Derogation especes protegees");
  });
});
