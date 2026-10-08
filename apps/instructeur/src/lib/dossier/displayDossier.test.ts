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
  const withPorteur = (porteur_de_projet: unknown) =>
    ({ porteur_de_projet }) as unknown as DossierSummary;

  it("shows the legal name and the SIRET of a personne morale", () => {
    expect(
      formatPorteurDeProjet(
        withPorteur({ type: "personne_morale", siret: "12345678901234", legal_name: "EDF" }),
      ),
    ).toBe("EDF (12345678901234)");
  });

  it("uses the SIRET when a legal name is unavailable", () => {
    expect(
      formatPorteurDeProjet(
        withPorteur({ type: "personne_morale", siret: "12345678901234", legal_name: null }),
      ),
    ).toBe("SIRET 12345678901234");
  });

  it("shows the name of a personne physique", () => {
    expect(
      formatPorteurDeProjet(
        withPorteur({ type: "personne_physique", last_name: "Martin", first_names: "Camille" }),
      ),
    ).toBe("Martin Camille");
  });

  it("does not fall back on the deposant without porteur", () => {
    const dossier = {
      porteur_de_projet: null,
      deposant_last_name: "Durand",
      deposant_first_names: "Alice",
    } as unknown as DossierSummary;
    expect(formatPorteurDeProjet(dossier)).toBe("Non renseigné");
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
