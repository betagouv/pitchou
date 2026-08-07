import { describe, expect, it } from "vitest";

import {
  dossierRequestContextOptions,
  legacyMotifDerogationOptions,
  motifDerogationOptions,
  requiresEspecesPriseDetentionLimiteeType,
  requiresOperationDates,
} from "../dossierFormOptions.ts";

describe("requiresEspecesPriseDetentionLimiteeType", () => {
  it("recognizes the current and legacy limited-taking reasons", () => {
    expect(requiresEspecesPriseDetentionLimiteeType(motifDerogationOptions[6])).toBe(true);
    expect(requiresEspecesPriseDetentionLimiteeType(legacyMotifDerogationOptions[6])).toBe(true);
  });

  it("does not apply to the research reason", () => {
    expect(requiresEspecesPriseDetentionLimiteeType(motifDerogationOptions[4])).toBe(false);
  });
});

describe("requiresOperationDates", () => {
  it("applies to direct requests and complete request-context paths", () => {
    expect(requiresOperationDates("Demande à caractère scientifique", null)).toBe(true);
    expect(
      requiresOperationDates("Production énergie renouvelable - Éolien -  Suivi mortalité", null),
    ).toBe(true);
    expect(requiresOperationDates("Carrières", dossierRequestContextOptions[2])).toBe(true);
  });

  it("does not apply to upstream support", () => {
    expect(requiresOperationDates("Carrières", dossierRequestContextOptions[0])).toBe(false);
  });
});
