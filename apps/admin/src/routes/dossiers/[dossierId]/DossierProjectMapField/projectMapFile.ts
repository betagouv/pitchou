import { DOMParser, type Document, type Element } from "@xmldom/xmldom";

import { isValidProjectMap } from "$lib/projectMapValidation.ts";

import type { FeatureCollection, ProjectMapFeature } from "../dossierAdminFormModel.ts";
import { selectionFeature, type Position } from "./projectMapGeometry.ts";

function validPosition([longitude, latitude]: Position): boolean {
  return Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90;
}

function coordinates(raw: string): Position[] {
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split(/\s+/)
    .map((coordinate) => {
      const parts = coordinate.split(",");
      if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
        throw new Error("Le fichier contient des coordonnées invalides.");
      }
      const [longitude, latitude] = parts.map(Number);
      const position: Position = [longitude, latitude];
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || !validPosition(position)) {
        throw new Error("Le fichier contient des coordonnées invalides.");
      }
      return position;
    });
}

function elements(root: Document | Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagName("*")).filter(
    (element) => element.localName === localName,
  );
}

function parseXml(text: string, expectedRoot: string): Document {
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") throw new Error(`Le fichier XML n'est pas valide : ${message}`);
    },
  }).parseFromString(text, "application/xml");
  if (document.documentElement?.localName !== expectedRoot) {
    throw new Error(`Le fichier doit être au format ${expectedRoot.toUpperCase()}.`);
  }
  return document;
}

function closedRing(element: Element): Position[] | null {
  const ring = coordinates(elements(element, "coordinates")[0]?.textContent ?? "");
  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring.at(-1);
  if (last?.[0] !== first[0] || last?.[1] !== first[1]) ring.push(first);
  return ring;
}

function kmlFeatures(xml: string): ProjectMapFeature[] {
  const document = parseXml(xml, "kml");
  const features: ProjectMapFeature[] = [];
  for (const point of elements(document, "Point")) {
    const positions = coordinates(elements(point, "coordinates")[0]?.textContent ?? "");
    if (positions[0]) features.push(selectionFeature({ type: "Point", coordinates: positions[0] }));
  }
  for (const line of elements(document, "LineString")) {
    const positions = coordinates(elements(line, "coordinates")[0]?.textContent ?? "");
    if (positions.length >= 2) {
      features.push(selectionFeature({ type: "LineString", coordinates: positions }));
    }
  }
  for (const polygon of elements(document, "Polygon")) {
    const outerBoundaries = elements(polygon, "outerBoundaryIs");
    if (outerBoundaries.length !== 1) {
      throw new Error("Un polygone KML doit contenir une limite extérieure.");
    }
    const outerRing = closedRing(outerBoundaries[0]);
    if (!outerRing) throw new Error("La limite extérieure du polygone KML est invalide.");
    const innerRings = elements(polygon, "innerBoundaryIs").map(closedRing);
    if (innerRings.some((ring) => ring === null)) {
      throw new Error("Une limite intérieure du polygone KML est invalide.");
    }
    features.push(
      selectionFeature({
        type: "Polygon",
        coordinates: [outerRing, ...(innerRings as Position[][])],
      }),
    );
  }
  return features;
}

function gpxPosition(element: Element): Position {
  const rawLatitude = element.getAttribute("lat");
  const rawLongitude = element.getAttribute("lon");
  if (!rawLatitude?.trim() || !rawLongitude?.trim()) {
    throw new Error("Le fichier contient des coordonnées invalides.");
  }
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const position: Position = [longitude, latitude];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !validPosition(position)) {
    throw new Error("Le fichier contient des coordonnées invalides.");
  }
  return position;
}

function gpxPoints(root: Document | Element, tag: string): Position[] {
  return elements(root, tag).map(gpxPosition);
}

function gpxFeatures(xml: string): ProjectMapFeature[] {
  const document = parseXml(xml, "gpx");
  const features = gpxPoints(document, "wpt").map((position) =>
    selectionFeature({ type: "Point", coordinates: position }),
  );
  for (const track of elements(document, "trkseg")) {
    const points = gpxPoints(track, "trkpt");
    if (points.length >= 2)
      features.push(selectionFeature({ type: "LineString", coordinates: points }));
  }
  for (const route of elements(document, "rte")) {
    const points = gpxPoints(route, "rtept");
    if (points.length >= 2)
      features.push(selectionFeature({ type: "LineString", coordinates: points }));
  }
  return features;
}

function geoJson(text: string): FeatureCollection {
  const parsed: unknown = JSON.parse(text);
  if (!isValidProjectMap(parsed)) {
    throw new Error("Le fichier doit être une FeatureCollection GeoJSON valide.");
  }
  return parsed as FeatureCollection;
}

export function parseProjectMapFile(name: string, text: string): FeatureCollection {
  const extension = name.split(".").at(-1)?.toLowerCase();
  if (extension === "json" || extension === "geojson") return geoJson(text);
  const features =
    extension === "kml" ? kmlFeatures(text) : extension === "gpx" ? gpxFeatures(text) : [];
  const map: FeatureCollection = { type: "FeatureCollection", features };
  if (features.length === 0 || !isValidProjectMap(map)) {
    throw new Error("Aucune géométrie exploitable trouvée dans le fichier.");
  }
  return map;
}
