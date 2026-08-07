import type { FeatureCollection, ProjectMapFeature } from "./dossierAdminFormModel.ts";

export type Position = [number, number];
export type ProjectMapMode = "navigate" | "point" | "line" | "polygon" | "rectangle" | "parcel";

export const emptyFeatureCollection = (): FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
});

export function selectionFeature(
  geometry: ProjectMapFeature["geometry"],
  source = "selection_utilisateur",
  properties: Record<string, unknown> = {},
): ProjectMapFeature {
  return {
    type: "Feature",
    geometry,
    properties: { ...properties, source, description: properties.description ?? null },
  };
}

export function rectangle(first: Position, second: Position): ProjectMapFeature {
  const [west, east] = [first[0], second[0]].sort((left, right) => left - right);
  const [south, north] = [first[1], second[1]].sort((left, right) => left - right);
  return selectionFeature({
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  });
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function distance([lng1, lat1]: Position, [lng2, lat2]: Position): number {
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lineLength(coordinates: unknown): number | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const positions = coordinates.filter(
    (item): item is Position =>
      Array.isArray(item) && typeof item[0] === "number" && typeof item[1] === "number",
  );
  if (positions.length < 2) return null;
  return positions.slice(1).reduce((total, item, index) => {
    return total + distance(positions[index], item);
  }, 0);
}

function polygonArea(coordinates: unknown): number | null {
  if (!Array.isArray(coordinates) || !Array.isArray(coordinates[0])) return null;
  const ring = coordinates[0].filter(
    (item: unknown): item is Position =>
      Array.isArray(item) && typeof item[0] === "number" && typeof item[1] === "number",
  );
  if (ring.length < 4) return null;
  const latitude = ring.reduce((sum, item) => sum + item[1], 0) / ring.length;
  const metersPerLngDegree = 111_320 * Math.cos(radians(latitude));
  const metersPerLatDegree = 110_540;
  const area = ring.reduce((sum, current, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + current[0] * metersPerLngDegree * next[1] * metersPerLatDegree;
  }, 0);
  const reverseArea = ring.reduce((sum, current, index) => {
    const next = ring[(index + 1) % ring.length];
    return sum + current[1] * metersPerLatDegree * next[0] * metersPerLngDegree;
  }, 0);
  return Math.abs(area - reverseArea) / 2;
}

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function featureLabel(feature: ProjectMapFeature): string {
  const properties = feature.properties ?? {};
  if (properties.source === "cadastre") {
    const parcelNumber = String(properties.numero ?? "").replace(/^0+/, "") || "?";
    const sheet = String(properties.feuille ?? "?").padStart(3, "0");
    const section = String(properties.section ?? "?");
    const area = Number(properties.contenance);
    const commune = String(properties.code_insee ?? "?");
    return `Parcelle n° ${parcelNumber} - Feuille ${sheet} ${section} - ${number.format(area)} m² - commune ${commune}`;
  }
  if (feature.geometry.type === "Point") {
    const [lng, lat] = feature.geometry.coordinates as Position;
    return `Un point situé à ${number.format(lat)}°, ${number.format(lng)}°`;
  }
  if (feature.geometry.type === "LineString") {
    const length = lineLength(feature.geometry.coordinates);
    return length === null ? "Une ligne" : `Une ligne longue de ${number.format(length)} m`;
  }
  if (["Polygon", "MultiPolygon"].includes(feature.geometry.type)) {
    const area = polygonArea(
      feature.geometry.type === "MultiPolygon"
        ? (feature.geometry.coordinates as unknown[])?.[0]
        : feature.geometry.coordinates,
    );
    return area === null ? "Une aire" : `Une aire de surface ${number.format(area)} m²`;
  }
  return feature.geometry.type;
}

export function computeBounds(value: FeatureCollection): [number, number, number, number] | null {
  let bounds: [number, number, number, number] | null = null;
  const walk = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
      const [lng, lat] = coordinates as Position;
      bounds = bounds
        ? [
            Math.min(bounds[0], lng),
            Math.min(bounds[1], lat),
            Math.max(bounds[2], lng),
            Math.max(bounds[3], lat),
          ]
        : [lng, lat, lng, lat];
      return;
    }
    coordinates.forEach(walk);
  };
  value.features.forEach(({ geometry }) => walk(geometry.coordinates));
  return bounds;
}

function ringContainsPosition(ring: unknown, [lng, lat]: Position): boolean {
  if (!Array.isArray(ring)) return false;
  const positions = ring.filter(
    (item): item is Position =>
      Array.isArray(item) && typeof item[0] === "number" && typeof item[1] === "number",
  );
  let inside = false;
  for (
    let index = 0, previous = positions.length - 1;
    index < positions.length;
    previous = index++
  ) {
    const [currentLng, currentLat] = positions[index];
    const [previousLng, previousLat] = positions[previous];
    const intersects =
      currentLat > lat !== previousLat > lat &&
      lng <
        ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) + currentLng;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function featureContainsPosition(feature: ProjectMapFeature, position: Position): boolean {
  const coordinates = feature.geometry.coordinates;
  if (feature.geometry.type === "Polygon") {
    return Array.isArray(coordinates) && ringContainsPosition(coordinates[0], position);
  }
  if (feature.geometry.type === "MultiPolygon") {
    return (
      Array.isArray(coordinates) &&
      coordinates.some(
        (polygon) => Array.isArray(polygon) && ringContainsPosition(polygon[0], position),
      )
    );
  }
  return false;
}
