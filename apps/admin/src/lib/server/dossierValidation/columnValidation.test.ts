import { describe, expect, test } from "vitest";

import {
  dossierLocationScopeOptions,
  dossierRequestContextOptions,
  legacyMotifDerogationOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import { parseColumns as parseColumnsWithContext } from "./columnValidation.ts";

// A minimal activity referentiel: one canonical label plus a historical (renamed) one.
const activiteContext = {
  acceptedLabels: new Set(["Carrières", "Carrières (ancien libellé)"]),
  canonicalLabels: new Set(["Carrières"]),
  codeByLabel: new Map([
    ["Carrières", "carrieres"],
    ["Carrières (ancien libellé)", "carrieres"],
  ]),
};
const parseColumns = (raw: unknown) => parseColumnsWithContext(raw, activiteContext);

describe("parseColumns", () => {
  test("accepts constrained DN values and structured columns", () => {
    const parsed = parseColumns({
      main_activite: "Carrières",
      motif_derogation: motifDerogationOptions[0],
      departments: ["69"],
      regions: ["Auvergne-Rhône-Alpes"],
      location_scope: dossierLocationScopeOptions[0],
      primary_department: "69",
      request_context: dossierRequestContextOptions[0],
      scientifique_demande_type: [scientifiqueDemandeTypeOptions[0]],
      scientifique_intervenants: [{ nom_complet: "Camille Martin", qualification: "Ecologue" }],
      projet_map: { type: "FeatureCollection", features: [] },
    });

    expect(parsed).toMatchObject({
      main_activite: "Carrières",
      departments: JSON.stringify(["69"]),
      primary_department: "69",
      scientifique_intervenants: JSON.stringify([
        { nom_complet: "Camille Martin", qualification: "Ecologue" },
      ]),
      projet_map: JSON.stringify({ type: "FeatureCollection", features: [] }),
    });
  });

  test.each([
    ["main_activite", "Activité libre"],
    ["motif_derogation", "Motif libre"],
    ["departments", ["invalid"]],
    ["regions", ["Région inconnue"]],
    ["location_scope", "monde"],
    ["primary_department", "invalid"],
    ["request_context", "Cas inconnu"],
    ["scientifique_demande_type", ["Opération inconnue"]],
  ])("rejects an invalid constrained value for %s", (column, value) => {
    expect(() => parseColumns({ [column]: value })).toThrow();
  });

  test("accepts a historical activity label known to the referentiel", () => {
    expect(parseColumns({ main_activite: "Carrières (ancien libellé)" })).toMatchObject({
      main_activite: "Carrières (ancien libellé)",
    });
  });

  test("accepts an already-stored legacy derogation reason", () => {
    expect(parseColumns({ motif_derogation: legacyMotifDerogationOptions[4] })).toMatchObject({
      motif_derogation: legacyMotifDerogationOptions[4],
    });
  });

  test("rejects wind measurements with more than three decimal places", () => {
    expect(() => parseColumns({ eolien_tip_height: 123.4567 })).toThrow();
  });

  test("rejects an unknown wind mortality action", () => {
    expect(() => parseColumns({ eolien_mortality_actions: ["Action inconnue"] })).toThrow();
  });

  test("rejects a non-positive compensation count", () => {
    expect(() => parseColumns({ dossier_oiseau_simple_compensated_nids_count: 0 })).toThrow();
  });

  test("rejects malformed scientific intervenants and GeoJSON", () => {
    expect(() => parseColumns({ scientifique_intervenants: ["Camille"] })).toThrow();
    expect(() => parseColumns({ projet_map: { type: "Point", coordinates: [] } })).toThrow();
    expect(() =>
      parseColumns({
        projet_map: {
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: null }],
        },
      }),
    ).toThrow();
  });
});
