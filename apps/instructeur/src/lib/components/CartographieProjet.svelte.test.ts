import { render } from "@testing-library/svelte";
import { afterEach, expect, test, vi } from "vitest";

import type { GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";

const maplibre = vi.hoisted(() => {
  const maps: MockMap[] = [];

  class MockMap {
    addControl = vi.fn();
    addLayer = vi.fn();
    addSource = vi.fn();
    fitBounds = vi.fn();
    remove = vi.fn();
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
      maps.push(this);
    }

    on(event: string, listener: () => void) {
      if (event === "load") queueMicrotask(listener);
    }
  }

  return { Map: MockMap, NavigationControl: class {}, maps };
});

vi.mock("maplibre-gl", () => maplibre);

import CartographieProjet from "./CartographieProjet.svelte";

afterEach(() => {
  maplibre.maps.length = 0;
});

test("sends plain parcel data to MapLibre and displays cadastral context", async () => {
  const parcel: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-0.60687093, 44.80787021],
                [-0.60591458, 44.80787021],
                [-0.60591458, 44.80878579],
                [-0.60687093, 44.80878579],
                [-0.60687093, 44.80787021],
              ],
            ],
          ],
        },
        properties: { source: "cadastre" },
      },
    ],
  };

  const component = render(CartographieProjet, { featureCollection: parcel });

  await vi.waitFor(() => expect(maplibre.maps).toHaveLength(1));
  const [map] = maplibre.maps;
  await vi.waitFor(() => expect(map.addSource).toHaveBeenCalledOnce());
  const source = map.addSource.mock.calls[0][1] as {
    type: string;
    data: GeoJSONFeatureCollection;
  };
  expect(source).toEqual({ type: "geojson", data: parcel });
  expect(source.data).not.toBe(parcel);

  const style = (map.options as { style: { sources: Record<string, unknown>; layers: unknown[] } })
    .style;
  expect(style.sources).toHaveProperty("ign-cadastre");
  expect(style.layers).toContainEqual(
    expect.objectContaining({ id: "ign-cadastre", source: "ign-cadastre", minzoom: 14 }),
  );

  await vi.waitFor(() =>
    expect(map.fitBounds).toHaveBeenCalledWith(
      [-0.60687093, 44.80787021, -0.60591458, 44.80878579],
      { padding: 40, maxZoom: 16, duration: 0 },
    ),
  );

  component.unmount();
  expect(map.remove).toHaveBeenCalledOnce();
});
