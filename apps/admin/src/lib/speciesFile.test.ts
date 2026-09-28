import { describe, expect, it } from "vitest";

import { speciesFileError } from "./speciesFile.ts";

describe("speciesFileError", () => {
  it("accepts supported spreadsheets, with or without a known size", () => {
    expect(speciesFileError({ name: "especes.xlsx", size: 1_024 })).toBeNull();
    expect(speciesFileError({ name: "especes.ods", size: 1_024 })).toBeNull();
    expect(speciesFileError({ name: "especes.ods" })).toBeNull();
  });

  it("rejects empty and unsupported files", () => {
    expect(speciesFileError({ name: "especes.xlsx", size: 0 })).toBeTruthy();
    expect(speciesFileError({ name: "especes.pdf", size: 1_024 })).toBeTruthy();
    expect(speciesFileError({ name: "especes.csv", size: 1_024 })).toBeTruthy();
  });
});
