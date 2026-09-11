import { describe, expect, it } from "vitest";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

import { formatLastModified, formatLocalisation, formatPorteurDeProjet } from "./displayDossier.ts";

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

describe("formatLastModified", () => {
  it("compte les jours calendaires, avec les formulations du jour et de la veille", () => {
    const now = new Date();
    const daysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date;
    };

    expect(formatLastModified(now)).toBe("Modifié aujourd'hui");
    expect(formatLastModified(daysAgo(1))).toBe("Modifié hier");
    expect(formatLastModified(daysAgo(2))).toBe("Modifié il y a 2 jours");
    expect(formatLastModified(daysAgo(12))).toBe("Modifié il y a 12 jours");
  });

  it("au-delà du mois, le nombre de jours ne dit plus rien", () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 70);
    expect(formatLastModified(longAgo)).toMatch(/^Modifié il y a (environ )?2 mois$/);
  });

  it("sans date de modification connue, le badge reste générique", () => {
    expect(formatLastModified(null)).toBe("Nouveauté");
    expect(formatLastModified("pas une date")).toBe("Nouveauté");
  });

  it("accepte une date sérialisée", () => {
    expect(formatLastModified(new Date().toISOString())).toBe("Modifié aujourd'hui");
  });
});
