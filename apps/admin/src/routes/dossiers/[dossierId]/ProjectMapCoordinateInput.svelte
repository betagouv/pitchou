<script lang="ts">
  import { parseMapCoordinates } from "./projectMapCoordinates.ts";
  import type { Position } from "./projectMapGeometry.ts";
  let { onAdd }: { onAdd: (position: Position) => void } = $props();
  let value = $state("");
  let error = $state<string | null>(null);
  function add() {
    const position = parseMapCoordinates(value);
    if (!position) {
      error = "Saisissez des coordonnées valides.";
      return;
    }
    error = null;
    onAdd(position);
    value = "";
  }
</script>

<div class="fr-input-group fr-mt-3w">
  <label class="fr-label" for="project-map-coordinates"
    >Ajouter un point sur la carte<span class="fr-hint-text"
      >Exemple : 43°48'06&quot;N 006°14'59&quot;E</span
    ></label
  >
  <div class="flex gap-2">
    <input
      class="fr-input flex-1"
      id="project-map-coordinates"
      type="text"
      placeholder={`43°48'06"N 006°14'59"E`}
      bind:value
      onkeydown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          add();
        }
      }}
    />
    <button class="fr-btn fr-icon-add-line" type="button" title="Ajouter le point" onclick={add}
      ><span class="fr-sr-only">Ajouter le point</span></button
    >
  </div>
  {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
</div>
