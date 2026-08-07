<script lang="ts">
  import { onMount } from "svelte";
  import type { Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

  import type { FeatureCollection, ProjectMapFeature } from "./dossierAdminFormModel.ts";
  import { ParcelHoverLoader } from "./projectMapCadastre.ts";
  import {
    emptyFeatureCollection,
    rectangle,
    selectionFeature,
    type Position,
    type ProjectMapMode,
  } from "./projectMapGeometry.ts";
  import { createProjectMap } from "./projectMapSetup.ts";
  import * as projectMapDrawing from "./projectMapDrawing.ts";
  import { projectMapError } from "./projectMapError.ts";
  import {
    cadastralFeatureCollection,
    draftFeatureCollection,
    setMapData,
  } from "./projectMapSources.ts";
  import ProjectMapSearch from "./ProjectMapSearch.svelte";
  import ProjectMapToolbar from "./ProjectMapToolbar.svelte";
  import ProjectMapCoordinateInput from "./ProjectMapCoordinateInput.svelte";

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
  let error = $state<string | null>(null);
  let parcelLoading = $state(false);
  const parcelHover = new ParcelHoverLoader();

  function updateSource(sourceId: string, data: FeatureCollection) {
    if (!loaded) return;
    void setMapData(map, sourceId, data).catch((caught) => (error = projectMapError(caught)));
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
    const next = projectMapDrawing.appendMapFeatures(value, features);
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
    const feature = projectMapDrawing.completedDraftFeature(mode, draft);
    if (feature) addFeatures([feature]);
    selectMode("navigate");
  }

  async function selectParcel(event: MapMouseEvent) {
    if (!map) return;
    parcelLoading = true;
    error = null;
    try {
      const feature = await parcelHover.at(map, event);
      const knownIds = projectMapDrawing.selectedParcelIds(value);
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

  function addCoordinatePoint(position: Position) {
    addFeatures([selectionFeature({ type: "Point", coordinates: position })]);
    map?.flyTo({ center: position, zoom: 17 });
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

<ProjectMapSearch
  onFound={(position) => map?.flyTo({ center: position, zoom: 17 })}
  onError={(caught) => (error = projectMapError(caught))}
/>

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
  <ProjectMapCoordinateInput onAdd={addCoordinatePoint} />
{/if}
