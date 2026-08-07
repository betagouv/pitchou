import { describe, expect, it } from "vitest";

import { MAX_SPECIES_FILE_SIZE, speciesFileError } from "./speciesFile.ts";

describe("speciesFileError", () => {
  it("accepts supported spreadsheets", () => {
    expect(speciesFileError({ name: "especes.xlsx", size: 1_024 })).toBeNull();
    expect(speciesFileError({ name: "especes.ods", size: 1_024 })).toBeNull();
  });

  it("rejects empty, oversized, and unsupported files", () => {
    expect(speciesFileError({ name: "especes.xlsx", size: 0 })).toBeTruthy();
    expect(
      speciesFileError({ name: "especes.xlsx", size: MAX_SPECIES_FILE_SIZE + 1 }),
    ).toBeTruthy();
    expect(speciesFileError({ name: "especes.pdf", size: 1_024 })).toBeTruthy();
    expect(speciesFileError({ name: "especes.csv", size: 1_024 })).toBeTruthy();
  });
});
