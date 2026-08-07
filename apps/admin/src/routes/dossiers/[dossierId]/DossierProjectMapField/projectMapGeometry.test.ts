import { describe, expect, it } from "vitest";

import {
  computeBounds,
  featureContainsPosition,
  featureLabel,
  rectangle,
  selectionFeature,
} from "./projectMapGeometry.ts";

describe("project map geometry", () => {
  it("creates a closed rectangle from two opposite corners", () => {
    const feature = rectangle([4, 46], [2, 48]);

    expect(feature.geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [2, 46],
          [4, 46],
          [4, 48],
          [2, 48],
          [2, 46],
        ],
      ],
    });
  });

  it("labels user lines and cadastral parcels", () => {
    const line = selectionFeature({
      type: "LineString",
      coordinates: [
        [2, 46],
        [2.001, 46],
      ],
    });
    const parcel = selectionFeature({ type: "Polygon", coordinates: [] }, "cadastre", {
      numero: "0057",
      feuille: 1,
      section: "HI",
      contenance: 1234,
      code_insee: "33063",
    });

    expect(featureLabel(line)).toMatch(/^Une ligne longue de /);
    expect(featureLabel(parcel)).toBe("Parcelle n° 57 - Feuille 001 HI - 1 234 m² - commune 33063");
  });

  it("computes bounds across different geometries", () => {
    expect(
      computeBounds({
        type: "FeatureCollection",
        features: [
          selectionFeature({ type: "Point", coordinates: [4, 46] }),
          rectangle([2, 45], [3, 48]),
        ],
      }),
    ).toEqual([2, 45, 4, 48]);
  });

  it("identifies the parcel containing the pointer", () => {
    const parcel = rectangle([2, 45], [4, 47]);

    expect(featureContainsPosition(parcel, [3, 46])).toBe(true);
    expect(featureContainsPosition(parcel, [5, 46])).toBe(false);
  });
});
