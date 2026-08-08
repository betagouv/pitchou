import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import type { FeatureCollection } from "../dossierAdminFormModel.ts";
import { selectionFeature, type Position } from "./geometry.ts";

export async function setMapData(
  map: MapLibreMap | undefined,
  sourceId: string,
  data: FeatureCollection,
) {
  if (!map) throw new Error("La carte n'est pas encore disponible.");
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source) throw new Error(`La source cartographique « ${sourceId} » est indisponible.`);
  await source.setData(JSON.parse(JSON.stringify(data)) as never);
}

export function cadastralFeatureCollection(data: FeatureCollection): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: data.features.filter(({ properties }) => properties?.source === "cadastre"),
  };
}

export function draftFeatureCollection(draft: Position[]): FeatureCollection {
  const features = draft.map((coordinates) => selectionFeature({ type: "Point", coordinates }));
  if (draft.length >= 2) {
    features.push(selectionFeature({ type: "LineString", coordinates: draft }));
  }
  return { type: "FeatureCollection", features };
}
