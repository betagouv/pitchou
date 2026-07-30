import { describe, expect, test } from "vitest";

import {
  dossierLocationScopeOptions,
  dossierMainActiviteOptions,
  motifDerogationOptions,
  scientifiqueDemandeTypeOptions,
} from "@pitchou/common/dossierFormOptions.ts";
import { parseColumns } from "./dossierColumnValidation.ts";

describe("parseColumns", () => {
  test("accepts constrained DN values and structured columns", () => {
    const parsed = parseColumns({
      main_activite: dossierMainActiviteOptions[0],
      motif_derogation: motifDerogationOptions[0],
      departments: ["69"],
      regions: ["Auvergne-Rhône-Alpes"],
      location_scope: dossierLocationScopeOptions[0],
      scientifique_demande_type: [scientifiqueDemandeTypeOptions[0]],
      scientifique_intervenants: [{ nom_complet: "Camille Martin", qualification: "Ecologue" }],
      projet_map: { type: "FeatureCollection", features: [] },
    });

    expect(parsed).toMatchObject({
      main_activite: dossierMainActiviteOptions[0],
      departments: JSON.stringify(["69"]),
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
    ["scientifique_demande_type", ["Opération inconnue"]],
  ])("rejects an invalid constrained value for %s", (column, value) => {
    expect(() => parseColumns({ [column]: value })).toThrow();
  });

  test("rejects malformed scientific intervenants and GeoJSON", () => {
    expect(() => parseColumns({ scientifique_intervenants: ["Camille"] })).toThrow();
    expect(() => parseColumns({ projet_map: { type: "Point", coordinates: [] } })).toThrow();
  });
});
