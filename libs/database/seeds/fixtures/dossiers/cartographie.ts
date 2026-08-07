import type { GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";

// "Cartographie du projet" helpers
// The map data is a GeoJSON FeatureCollection, exactly as synced from Démarche
// Numérique. These helpers build plausible zones near each dossier's location so
// the feature is visible in local/staging demos.

/** A square Polygon zone of side ~`size`° centered on [lng, lat]. */
export function zoneCarree(lng: number, lat: number, size: number, description: string) {
  const h = size / 2;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng - h, lat - h],
          [lng + h, lat - h],
          [lng + h, lat + h],
          [lng - h, lat + h],
          [lng - h, lat - h],
        ],
      ],
    },
    properties: { source: "selection_utilisateur", description },
  };
}

/** A LineString feature following the given [lng, lat] points (e.g. a linear project). */
export function ligne(points: [number, number][], description: string) {
  return {
    type: "Feature" as const,
    geometry: { type: "LineString", coordinates: points },
    properties: { source: "selection_utilisateur", description },
  };
}

/** Wrap features into a GeoJSON FeatureCollection. */
export function cartographie(
  ...features: ReturnType<typeof zoneCarree | typeof ligne>[]
): GeoJSONFeatureCollection {
  return { type: "FeatureCollection", features };
}
