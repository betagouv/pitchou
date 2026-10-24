<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";
  import { dumpLink } from "./navigation.ts";
  let { columns, selected }: { columns: string[]; selected: string[] } = $props();
  let currentUrl = $derived(page.shallow?.url ?? page.url);
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key !== "Escape") return;
    const trigger = document.getElementById("visible-columns");
    if (trigger?.getAttribute("aria-expanded") === "true") {
      trigger.click();
      trigger.focus();
    }
  }}
/>
<div class="onagre-field dump-column-picker">
  <label for="visible-columns">Colonnes affichées</label>
  <MultiSelectFilter
    id="visible-columns"
    label="Choisir les colonnes affichées"
    allLabel="Toutes les colonnes"
    noneLabel="Aucune colonne"
    options={columns.map((value) => ({ value, label: value }))}
    {selected}
    selectionMode={selected.length === columns.length
      ? "all"
      : selected.length === 0
        ? "none"
        : "custom"}
    onChange={(values, mode) =>
      goto(dumpLink(currentUrl, { columns: mode === "all" ? null : JSON.stringify(values) }), {
        shallow: true,
        replace: true,
        reset: false,
      })}
  />
</div>
