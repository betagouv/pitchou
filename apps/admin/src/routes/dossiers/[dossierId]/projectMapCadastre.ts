import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

import type { ProjectMapFeature } from "./dossierAdminFormModel.ts";
import {
  featureContainsPosition,
  rectangle,
  selectionFeature,
  type Position,
} from "./projectMapGeometry.ts";

export async function loadParcelAt(
  map: MapLibreMap,
  event: MapMouseEvent,
  signal?: AbortSignal,
): Promise<ProjectMapFeature | null> {
  const northwest = map.unproject([event.point.x - 3, event.point.y - 3]);
  const southeast = map.unproject([event.point.x + 3, event.point.y + 3]);
  const geometry = rectangle(
    [northwest.lng, southeast.lat],
    [southeast.lng, northwest.lat],
  ).geometry;
  const url = new URL("https://apicarto.ign.fr/api/cadastre/parcelle");
  url.searchParams.set("geom", JSON.stringify(geometry));
  url.searchParams.set("_limit", "20");
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Le cadastre n'est pas disponible.");
  const result = (await response.json()) as { features?: ProjectMapFeature[] };
  const position: Position = [event.lngLat.lng, event.lngLat.lat];
  const feature =
    result.features?.find((candidate) => featureContainsPosition(candidate, position)) ?? null;
  return feature ? selectionFeature(feature.geometry, "cadastre", feature.properties ?? {}) : null;
}

export class ParcelHoverLoader {
  current: ProjectMapFeature | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #controller: AbortController | undefined;

  clear() {
    this.current = null;
    this.#controller?.abort();
    if (this.#timer) clearTimeout(this.#timer);
  }

  queue(
    map: MapLibreMap,
    event: MapMouseEvent,
    onResult: (feature: ProjectMapFeature | null) => void,
  ) {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(async () => {
      this.#controller?.abort();
      this.#controller = new AbortController();
      try {
        this.current = await loadParcelAt(map, event, this.#controller.signal);
        onResult(this.current);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        this.current = null;
        onResult(null);
      }
    }, 120);
  }

  async at(map: MapLibreMap, event: MapMouseEvent): Promise<ProjectMapFeature | null> {
    const position: Position = [event.lngLat.lng, event.lngLat.lat];
    return this.current && featureContainsPosition(this.current, position)
      ? this.current
      : loadParcelAt(map, event);
  }
}
