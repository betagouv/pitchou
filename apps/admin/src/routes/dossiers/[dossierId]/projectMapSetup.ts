import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

import type { FeatureCollection } from "./dossierAdminFormModel.ts";
import { computeBounds, emptyFeatureCollection } from "./projectMapGeometry.ts";
import { cadastralFeatureCollection } from "./projectMapSources.ts";

const ORTHO_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";
const CADASTRE_TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
  "&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png" +
  "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

type Options = {
  container: HTMLDivElement;
  initialValue: FeatureCollection | null;
  onLoad: (map: MapLibreMap) => void;
  onClick: (event: MapMouseEvent) => void;
  onDoubleClick: (event: MapMouseEvent) => void;
  onMouseMove: (event: MapMouseEvent) => void;
  onMouseLeave: () => void;
  onError: (message: string) => void;
};

export async function createProjectMap(options: Options): Promise<MapLibreMap> {
  const maplibregl = await import("maplibre-gl");
  await import("maplibre-gl/dist/maplibre-gl.css");
  const initialValue = JSON.parse(
    JSON.stringify(options.initialValue ?? emptyFeatureCollection()),
  ) as FeatureCollection;
  const map = new maplibregl.Map({
    container: options.container,
    center: [2.35, 46.8],
    zoom: 4,
    style: {
      version: 8,
      sources: {
        ortho: { type: "raster", tiles: [ORTHO_TILES], tileSize: 256 },
        cadastre: { type: "raster", tiles: [CADASTRE_TILES], tileSize: 256 },
        "project-map": { type: "geojson", data: initialValue },
        "project-map-draft": { type: "geojson", data: emptyFeatureCollection() },
        "project-map-hover": { type: "geojson", data: emptyFeatureCollection() },
        "project-map-selected-parcels": {
          type: "geojson",
          data: cadastralFeatureCollection(initialValue),
        },
      },
      layers: [
        { id: "ortho", type: "raster", source: "ortho" },
        {
          id: "cadastre",
          type: "raster",
          source: "cadastre",
          minzoom: 14,
          paint: { "raster-opacity": 0.35 },
        },
      ],
    },
  });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("load", () => {
    for (const id of ["project-map", "project-map-draft"]) {
      map.addLayer({
        id: `${id}-fill`,
        type: "fill",
        source: id,
        paint: { "fill-color": "#18753c", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: `${id}-line`,
        type: "line",
        source: id,
        paint: { "line-color": "#18753c", "line-width": 3 },
      });
      map.addLayer({
        id: `${id}-point`,
        type: "circle",
        source: id,
        paint: { "circle-color": "#18753c", "circle-radius": 7 },
      });
    }
    map.addLayer({
      id: "project-map-hover-fill",
      type: "fill",
      source: "project-map-hover",
      paint: { "fill-color": "#feecc2", "fill-opacity": 0.65 },
    });
    map.addLayer({
      id: "project-map-hover-line",
      type: "line",
      source: "project-map-hover",
      paint: { "line-color": "#a55800", "line-width": 3 },
    });
    map.addLayer({
      id: "project-map-selected-parcel-fill",
      type: "fill",
      source: "project-map-selected-parcels",
      paint: { "fill-color": "#18753c", "fill-opacity": 0.65 },
    });
    map.addLayer({
      id: "project-map-selected-parcel-line",
      type: "line",
      source: "project-map-selected-parcels",
      paint: { "line-color": "#006131", "line-width": 4 },
    });
    for (const sourceId of [
      "project-map",
      "project-map-draft",
      "project-map-hover",
      "project-map-selected-parcels",
    ]) {
      const source = map.getSource(sourceId) as GeoJSONSource;
      source.on("error", (event) => options.onError(event.error.message));
    }
    options.onLoad(map);
    const bounds = computeBounds(options.initialValue ?? emptyFeatureCollection());
    if (bounds) map.fitBounds(bounds, { padding: 40, maxZoom: 17, duration: 0 });
  });
  map.on("click", options.onClick);
  map.on("dblclick", options.onDoubleClick);
  map.on("mousemove", options.onMouseMove);
  map.getCanvas().addEventListener("mouseleave", options.onMouseLeave);
  return map;
}
