<script lang="ts">
  import { onMount } from "svelte";
  import type { Map as MapLibreMap } from "maplibre-gl";

  import type { GeoJSONFeatureCollection } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    featureCollection: GeoJSONFeatureCollection;
  };

  let { featureCollection }: Props = $props();

  let mapContainer: HTMLDivElement;

  // IGN Géoplateforme raster ortho tiles (public, no API key), to match the Démarche Numérique view.
  const IGN_ORTHO_TILES =
    "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0" +
    "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg" +
    "&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

  const ATTRIBUTION =
    '<a href="https://www.geoportail.gouv.fr/" target="_blank" rel="noopener">IGN-F/Géoportail</a> — © OpenStreetMap';

  // "rouge marianne" from the DSFR palette, close to the red the Démarche Numérique map uses.
  const ZONE_COLOR = "#e1000f";

  /** Walk nested GeoJSON coordinates to compute a [west, south, east, north] bbox. */
  function computeBounds(fc: GeoJSONFeatureCollection): [number, number, number, number] | null {
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let found = false;

    const walk = (coords: unknown) => {
      if (!Array.isArray(coords)) return;
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        const [lng, lat] = coords as [number, number];
        west = Math.min(west, lng);
        east = Math.max(east, lng);
        south = Math.min(south, lat);
        north = Math.max(north, lat);
        found = true;
        return;
      }
      for (const child of coords) walk(child);
    };

    for (const feature of fc.features) {
      walk((feature.geometry as { coordinates?: unknown }).coordinates);
    }

    return found ? [west, south, east, north] : null;
  }

  onMount(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    (async () => {
      // Client-only: maplibre-gl touches browser globals, so it is imported dynamically
      // to avoid SvelteKit SSR issues. The CSS is imported alongside it.
      const maplibregl = (await import("maplibre-gl")).default;
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled) return;

      map = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {
            "ign-ortho": {
              type: "raster",
              tiles: [IGN_ORTHO_TILES],
              tileSize: 256,
              attribution: ATTRIBUTION,
            },
          },
          layers: [{ id: "ign-ortho", type: "raster", source: "ign-ortho" }],
        },
        center: [2.35, 46.8], // centre of metropolitan France, overridden by fitBounds
        zoom: 4,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      map.on("load", () => {
        if (!map) return;
        map.addSource("cartographie-projet", { type: "geojson", data: featureCollection });
        map.addLayer({
          id: "cartographie-projet-fill",
          type: "fill",
          source: "cartographie-projet",
          paint: { "fill-color": ZONE_COLOR, "fill-opacity": 0.3 },
        });
        map.addLayer({
          id: "cartographie-projet-line",
          type: "line",
          source: "cartographie-projet",
          paint: { "line-color": ZONE_COLOR, "line-width": 2 },
        });

        const bounds = computeBounds(featureCollection);
        if (bounds) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  });
</script>

<div class="cartographie-projet" bind:this={mapContainer}></div>

<style lang="scss">
  .cartographie-projet {
    width: 100%;
    height: 30rem;
    border: 1px solid var(--border-default-grey, #dddddd);
  }
</style>
