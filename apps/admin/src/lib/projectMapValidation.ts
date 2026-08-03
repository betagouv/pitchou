const position = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  Number.isFinite(value[0]) &&
  Math.abs(value[0]) <= 180 &&
  typeof value[1] === "number" &&
  Number.isFinite(value[1]) &&
  Math.abs(value[1]) <= 90 &&
  value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));

const positions = (value: unknown, minimum: number) =>
  Array.isArray(value) && value.length >= minimum && value.every(position);

function ring(value: unknown): boolean {
  if (!positions(value, 4)) return false;
  const coordinates = value as [number, number][];
  const first = coordinates[0];
  const last = coordinates.at(-1);
  return last?.[0] === first[0] && last?.[1] === first[1];
}

function validGeometry(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const geometry = value as Record<string, unknown>;
  const coordinates = geometry.coordinates;
  if (geometry.type === "Point") return position(coordinates);
  if (geometry.type === "MultiPoint") return positions(coordinates, 1);
  if (geometry.type === "LineString") return positions(coordinates, 2);
  if (geometry.type === "MultiLineString") {
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 1 &&
      coordinates.every((line) => positions(line, 2))
    );
  }
  if (geometry.type === "Polygon") {
    return Array.isArray(coordinates) && coordinates.length >= 1 && coordinates.every(ring);
  }
  if (geometry.type === "MultiPolygon") {
    return (
      Array.isArray(coordinates) &&
      coordinates.length >= 1 &&
      coordinates.every(
        (polygon) => Array.isArray(polygon) && polygon.length >= 1 && polygon.every(ring),
      )
    );
  }
  return false;
}

export function isValidProjectMap(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const map = value as Record<string, unknown>;
  if (map.type !== "FeatureCollection" || !Array.isArray(map.features)) return false;
  return map.features.every((feature) => {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) return false;
    const candidate = feature as Record<string, unknown>;
    const properties = candidate.properties;
    return (
      candidate.type === "Feature" &&
      validGeometry(candidate.geometry) &&
      (properties === null || (typeof properties === "object" && !Array.isArray(properties)))
    );
  });
}
