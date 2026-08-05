import { describe, expect, it } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

import { formatLocalisation, formatPorteurDeProjet } from "./displayDossier.ts";

describe("formatLocalisation", () => {
  it("uses the explicit location scope for region and France dossiers", () => {
    expect(
      formatLocalisation({
        location_scope: "regions",
        communes: [],
        departments: [],
        regions: ["Bretagne"],
      }),
    ).toBe("Régions: Bretagne");
    expect(
      formatLocalisation({
        location_scope: "france",
        communes: [],
        departments: [],
        regions: [],
      }),
    ).toBe("France entière");
  });

  it("falls back to legacy location data when the scope is unavailable", () => {
    expect(formatLocalisation({ departments: ["35"] })).toBe("35");
    expect(formatLocalisation({ regions: ["Bretagne"] })).toBe("Régions: Bretagne");
    expect(formatLocalisation({ primary_department: "35" })).toBe("35");
  });
});

describe("formatPorteurDeProjet", () => {
  it("uses the SIRET when a legal name is unavailable", () => {
    const dossier = {
      demandeur_personne_morale_siret: "12345678901234",
      demandeur_personne_morale_legal_name: null,
    } as unknown as DossierSummary;

    expect(formatPorteurDeProjet(dossier)).toBe("SIRET 12345678901234");
  });
});
