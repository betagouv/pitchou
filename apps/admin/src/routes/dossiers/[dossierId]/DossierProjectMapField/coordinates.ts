import type { Position } from "./geometry.ts";

const coordinatePattern =
  /(\d{1,3})\s*°\s*(\d{1,2})\s*['’]\s*(\d{1,2}(?:[.,]\d+)?)\s*["”]?\s*([NSEW])/gi;

function decimalDegrees(degrees: string, minutes: string, seconds: string, direction: string) {
  const degreesValue = Number(degrees);
  const minutesValue = Number(minutes);
  const secondsValue = Number(seconds.replace(",", "."));
  const maximum = ["N", "S"].includes(direction.toUpperCase()) ? 90 : 180;
  if (degreesValue > maximum || minutesValue >= 60 || secondsValue >= 60) return null;
  const value = degreesValue + minutesValue / 60 + secondsValue / 3600;
  if (value > maximum) return null;
  return ["S", "W"].includes(direction.toUpperCase()) ? -value : value;
}

export function parseMapCoordinates(raw: string): Position | null {
  const dms = [...raw.matchAll(coordinatePattern)];
  if (dms.length === 2) {
    let latitude: number | undefined;
    let longitude: number | undefined;
    for (const coordinate of dms) {
      const value = decimalDegrees(coordinate[1], coordinate[2], coordinate[3], coordinate[4]);
      if (value === null) return null;
      if (["N", "S"].includes(coordinate[4].toUpperCase())) latitude = value;
      else longitude = value;
    }
    if (latitude !== undefined && longitude !== undefined) return [longitude, latitude];
  }

  const decimal = raw.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)\s*$/);
  if (!decimal) return null;
  const latitude = Number(decimal[1].replace(",", "."));
  const longitude = Number(decimal[2].replace(",", "."));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return [longitude, latitude];
}
