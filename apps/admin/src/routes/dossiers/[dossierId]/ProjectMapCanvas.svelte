<script lang="ts">
  import { onMount } from "svelte";
  import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

  import type { FeatureCollection, ProjectMapFeature } from "./dossierAdminFormModel.ts";
  import { findAddressCoordinates } from "./projectMapAddress.ts";
  import { parseMapCoordinates } from "./projectMapCoordinates.ts";
  import { ParcelHoverLoader } from "./projectMapCadastre.ts";
  import {
    emptyFeatureCollection,
    rectangle,
    selectionFeature,
    type Position,
    type ProjectMapMode,
  } from "./projectMapGeometry.ts";
  import { createProjectMap } from "./projectMapSetup.ts";
  import {
    cadastralFeatureCollection,
    draftFeatureCollection,
    setMapData,
  } from "./projectMapSources.ts";
  import ProjectMapAddressSearch from "./ProjectMapAddressSearch.svelte";
  import ProjectMapToolbar from "./ProjectMapToolbar.svelte";

  type Props = {
    value: FeatureCollection | null;
    disabled: boolean;
    onChange: (value: FeatureCollection | null) => void;
  };
  let { value, disabled, onChange }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: MapLibreMap | undefined;
  let loaded = $state(false);
  let mode = $state<ProjectMapMode>("navigate");
  let draft = $state<Position[]>([]);
  let address = $state("");
  let coordinateInput = $state("");
  let coordinateError = $state<string | null>(null);
  let error = $state<string | null>(null);
  let parcelLoading = $state(false);
  const parcelHover = new ParcelHoverLoader();

  function reportMapError(caught: unknown) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  function updateSource(sourceId: string, data: FeatureCollection) {
    if (!loaded) return;
    void setMapData(map, sourceId, data).catch(reportMapError);
  }

  const updateMap = (data = value ?? emptyFeatureCollection()) => {
    updateSource("project-map", data);
    updateSource("project-map-selected-parcels", cadastralFeatureCollection(data));
  };
  const updateDraft = () => updateSource("project-map-draft", draftFeatureCollection(draft));

  function clearHover() {
    parcelHover.clear();
    updateSource("project-map-hover", emptyFeatureCollection());
  }

  function addFeatures(features: ProjectMapFeature[]) {
    const next: FeatureCollection = {
      type: "FeatureCollection",
      features: [...(value?.features ?? []), ...features],
    };
    onChange(next);
    updateMap(next);
  }

  function selectMode(nextMode: ProjectMapMode) {
    mode = nextMode;
    draft = [];
    updateDraft();
    if (nextMode !== "parcel") clearHover();
    if (map) map.getCanvas().style.cursor = nextMode === "navigate" ? "grab" : "crosshair";
  }

  function finishLine() {
    const coordinates = draft.filter((position, index) => {
      const previous = draft[index - 1];
      return !previous || previous[0] !== position[0] || previous[1] !== position[1];
    });
    if (mode === "polygon" && coordinates.length >= 3) {
      coordinates.push(coordinates[0]);
      addFeatures([selectionFeature({ type: "Polygon", coordinates: [coordinates] })]);
    } else if (mode === "line" && coordinates.length >= 2) {
      addFeatures([selectionFeature({ type: "LineString", coordinates })]);
    }
    selectMode("navigate");
  }

  async function selectParcel(event: MapMouseEvent) {
    if (!map) return;
    parcelLoading = true;
    error = null;
    try {
      const feature = await parcelHover.at(map, event);
      const knownIds = new Set(
        (value?.features ?? []).map(({ properties }) => String(properties?.idu ?? "")),
      );
      if (!feature || knownIds.has(String(feature.properties?.idu ?? ""))) {
        error = "Aucune nouvelle parcelle trouvée à cet endroit.";
      } else {
        addFeatures([feature]);
        clearHover();
      }
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    } finally {
      parcelLoading = false;
    }
  }

  function queueParcelHover(event: MapMouseEvent) {
    if (!map || disabled || mode !== "parcel") return;
    parcelHover.queue(map, event, (feature) => {
      const selected = (value?.features ?? []).some(
        ({ properties }) => properties?.idu === feature?.properties?.idu,
      );
      updateSource("project-map-hover", {
        type: "FeatureCollection",
        features: feature && !selected ? [feature] : [],
      });
    });
  }

  async function handleClick(event: MapMouseEvent) {
    if (disabled || mode === "navigate") return;
    const position: Position = [event.lngLat.lng, event.lngLat.lat];
    if (mode === "point") {
      addFeatures([selectionFeature({ type: "Point", coordinates: position })]);
      selectMode("navigate");
    } else if (["line", "polygon"].includes(mode)) {
      draft = [...draft, position];
      updateDraft();
    } else if (mode === "rectangle") {
      if (draft.length === 0) {
        draft = [position];
        updateDraft();
      } else {
        addFeatures([rectangle(draft[0], position)]);
        selectMode("navigate");
      }
    } else if (mode === "parcel") await selectParcel(event);
  }

  async function searchAddress() {
    if (!map || !address.trim()) return;
    error = null;
    try {
      const coordinates = await findAddressCoordinates(address);
      map.flyTo({ center: coordinates, zoom: 17 });
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
  }

  function addCoordinatePoint() {
    const position = parseMapCoordinates(coordinateInput);
    if (!position) {
      coordinateError = "Saisissez des coordonnées valides.";
      return;
    }
    coordinateError = null;
    addFeatures([selectionFeature({ type: "Point", coordinates: position })]);
    map?.flyTo({ center: position, zoom: 17 });
    coordinateInput = "";
  }

  $effect(() => {
    value;
    if (loaded) updateMap();
  });

  onMount(() => {
    let cancelled = false;
    createProjectMap({
      container: mapContainer,
      initialValue: value,
      onLoad: (loadedMap) => {
        map = loadedMap;
        loaded = true;
        updateMap();
      },
      onClick: (event) => void handleClick(event),
      onDoubleClick: (event) => {
        if (!["line", "polygon"].includes(mode)) return;
        event.preventDefault();
        finishLine();
      },
      onMouseMove: queueParcelHover,
      onMouseLeave: clearHover,
      onError: (message) => (error = message),
    })
      .then((createdMap) => {
        if (cancelled) createdMap.remove();
        else map = createdMap;
      })
      .catch((caught) => {
        if (!cancelled) error = caught instanceof Error ? caught.message : String(caught);
      });
    return () => {
      cancelled = true;
      clearHover();
      map?.remove();
    };
  });
</script>

<ProjectMapAddressSearch bind:address onSearch={searchAddress} />

{#if !disabled}
  <ProjectMapToolbar
    {mode}
    draftCount={draft.length}
    busy={parcelLoading}
    onSelect={selectMode}
    onFinishLine={finishLine}
  />
{/if}

{#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
<div
  class="w-full h-[36rem] border border-[color:var(--border-default-grey)]"
  bind:this={mapContainer}
></div>

{#if !disabled}
  <div class="fr-input-group fr-mt-3w">
    <label class="fr-label" for="project-map-coordinates">
      Ajouter un point sur la carte
      <span class="fr-hint-text">Exemple : 43°48'06&quot;N 006°14'59&quot;E</span>
    </label>
    <div class="flex gap-2">
      <input
        class="fr-input flex-1"
        id="project-map-coordinates"
        type="text"
        placeholder={`43°48'06"N 006°14'59"E`}
        bind:value={coordinateInput}
        onkeydown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addCoordinatePoint();
          }
        }}
      />
      <button
        class="fr-btn fr-icon-add-line"
        type="button"
        title="Ajouter le point"
        onclick={addCoordinatePoint}
      >
        <span class="fr-sr-only">Ajouter le point</span>
      </button>
    </div>
    {#if coordinateError}<p class="fr-error-text" role="alert">{coordinateError}</p>{/if}
  </div>
{/if}
