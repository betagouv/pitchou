import { describe, expect, it } from "vitest";

import { isValidProjectMap } from "./projectMapValidation.ts";

describe("isValidProjectMap", () => {
  it("accepts supported, bounded geometries", () => {
    expect(
      isValidProjectMap({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [2, 48],
                  [3, 48],
                  [3, 49],
                  [2, 48],
                ],
              ],
            },
            properties: null,
          },
        ],
      }),
    ).toBe(true);
  });

  it("rejects missing, unclosed, and out-of-range geometries", () => {
    expect(isValidProjectMap({ type: "FeatureCollection", features: [{ type: "Feature" }] })).toBe(
      false,
    );
    expect(
      isValidProjectMap({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [2, 48],
                  [3, 48],
                  [3, 49],
                ],
              ],
            },
          },
        ],
      }),
    ).toBe(false);
    expect(
      isValidProjectMap({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [2, 48, "invalid"] },
            properties: null,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isValidProjectMap({
        type: "FeatureCollection",
        features: [{ type: "Feature", geometry: { type: "Point", coordinates: [200, 95] } }],
      }),
    ).toBe(false);
  });
});
