import { describe, it, expect } from "vitest";

import { departementName } from "./departements.ts";

describe("departementName", () => {
  it("resolves a mainland code", () => {
    expect(departementName("88")).toBe("Vosges");
  });

  it("resolves a code with a leading zero", () => {
    expect(departementName("01")).toBe("Ain");
  });

  it("resolves the Corsican codes", () => {
    expect(departementName("2A")).toBe("Corse-du-Sud");
    expect(departementName("2B")).toBe("Haute-Corse");
  });

  it("resolves an overseas code", () => {
    expect(departementName("974")).toBe("La Réunion");
  });

  it("resolves the special code used for foreign locations", () => {
    expect(departementName("99")).toBe("Étranger");
  });

  it("falls back to the code itself when it is unknown", () => {
    expect(departementName("999")).toBe("999");
  });
});
