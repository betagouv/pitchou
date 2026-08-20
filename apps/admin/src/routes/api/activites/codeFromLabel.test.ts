import { describe, expect, it } from "vitest";
import { activiteCodeFromLabel } from "./codeFromLabel.ts";

describe("activiteCodeFromLabel", () => {
  it("lowercases, strips accents and joins words with dashes", () => {
    expect(activiteCodeFromLabel("Carrières")).toBe("carrieres");
    expect(activiteCodeFromLabel("Projets liés à la gestion de l’eau")).toBe(
      "projets-lies-a-la-gestion-de-l-eau",
    );
  });

  it("collapses punctuation runs and trims leading or trailing dashes", () => {
    expect(activiteCodeFromLabel("Infrastructures - Autres")).toBe("infrastructures-autres");
    expect(activiteCodeFromLabel("  (Événementiel)  ")).toBe("evenementiel");
  });

  it("returns an empty string when nothing alphanumeric remains", () => {
    expect(activiteCodeFromLabel("«  »")).toBe("");
  });
});
