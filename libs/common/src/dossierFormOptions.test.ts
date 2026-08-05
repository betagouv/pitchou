import { describe, expect, it } from "vitest";

import {
  legacyMotifDerogationOptions,
  motifDerogationOptions,
  requiresEspecesPriseDetentionLimiteeType,
} from "./dossierFormOptions.ts";

describe("requiresEspecesPriseDetentionLimiteeType", () => {
  it("recognizes the current and legacy limited-taking reasons", () => {
    expect(requiresEspecesPriseDetentionLimiteeType(motifDerogationOptions[6])).toBe(true);
    expect(requiresEspecesPriseDetentionLimiteeType(legacyMotifDerogationOptions[6])).toBe(true);
  });

  it("does not apply to the research reason", () => {
    expect(requiresEspecesPriseDetentionLimiteeType(motifDerogationOptions[4])).toBe(false);
  });
});
