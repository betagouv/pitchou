import type { FeatureCollection, ProjectMapFeature } from "../dossierAdminFormModel.ts";
import { selectionFeature, type Position, type ProjectMapMode } from "./geometry.ts";

export function appendMapFeatures(
  value: FeatureCollection | null,
  features: ProjectMapFeature[],
): FeatureCollection {
  return { type: "FeatureCollection", features: [...(value?.features ?? []), ...features] };
}

export function selectedParcelIds(value: FeatureCollection | null): Set<string> {
  return new Set((value?.features ?? []).map(({ properties }) => String(properties?.idu ?? "")));
}

export function completedDraftFeature(
  mode: ProjectMapMode,
  draft: Position[],
): ProjectMapFeature | null {
  const coordinates = draft.filter((position, index) => {
    const previous = draft[index - 1];
    return !previous || previous[0] !== position[0] || previous[1] !== position[1];
  });
  if (mode === "polygon" && coordinates.length >= 3) {
    coordinates.push(coordinates[0]);
    return selectionFeature({ type: "Polygon", coordinates: [coordinates] });
  }
  return mode === "line" && coordinates.length >= 2
    ? selectionFeature({ type: "LineString", coordinates })
    : null;
}
