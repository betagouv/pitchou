import { describe, expect, it, vi } from "vitest";

import type { FeatureCollection } from "./dossierAdminFormModel.ts";
import { rectangle, selectionFeature } from "./projectMapGeometry.ts";
import { cadastralFeatureCollection, setMapData } from "./projectMapSources.ts";

describe("setMapData", () => {
  it("sends a plain cloned FeatureCollection to MapLibre", async () => {
    const setData = vi.fn().mockResolvedValue(undefined);
    const map = { getSource: () => ({ setData }) } as never;
    const value: FeatureCollection = {
      type: "FeatureCollection",
      features: [rectangle([2, 45], [4, 47])],
    };

    await setMapData(map, "project-map", value);

    expect(setData).toHaveBeenCalledWith(value);
    expect(setData.mock.calls[0][0]).not.toBe(value);
  });

  it("reports a missing source instead of silently dropping the update", async () => {
    const map = { getSource: () => undefined } as never;

    await expect(
      setMapData(map, "project-map", { type: "FeatureCollection", features: [] }),
    ).rejects.toThrow("project-map");
  });
});

describe("cadastralFeatureCollection", () => {
  it("keeps only selected cadastral parcels", () => {
    const parcel = selectionFeature(rectangle([2, 45], [4, 47]).geometry, "cadastre");
    const userRectangle = rectangle([3, 46], [5, 48]);

    expect(
      cadastralFeatureCollection({
        type: "FeatureCollection",
        features: [userRectangle, parcel],
      }),
    ).toEqual({ type: "FeatureCollection", features: [parcel] });
  });
});
