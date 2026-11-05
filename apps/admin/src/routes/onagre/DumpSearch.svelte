<script lang="ts">
  import { untrack } from "svelte";
  import { page, navigating } from "$app/state";
  import { filterError, maxFilters, type SourceFilter } from "@pitchou/common/onagre/filters.ts";
  import type { PageData } from "./$types";
  import DumpColumns from "./DumpColumns.svelte";
  import DumpFilterRow from "./DumpFilterRow.svelte";
  import { dumpLink } from "./navigation.ts";
  let {
    explorer,
    snapshotId,
    selected,
  }: {
    explorer: NonNullable<PageData["explorer"]>;
    snapshotId: number;
    selected: string[];
  } = $props();
  let filters = $state<SourceFilter[]>(
    untrack(() => explorer.filters.map((filter) => ({ ...filter }))),
  );
  let error = $state<string | null>(null);
  // A bound input preserves text entered before hydration completes.
  let search = $state(untrack(() => explorer.search));
  let pending = $derived(navigating.to !== null);
  let currentUrl = $derived(page.shallow?.url ?? page.url);
</script>

<form
  method="GET"
  class="dump-query"
  onsubmit={(event) => {
    error = filters.map(filterError).find((message) => message !== null) ?? null;
    if (error) event.preventDefault();
  }}
>
  <input type="hidden" name="tab" value="dump" />
  <input type="hidden" name="snapshot" value={snapshotId} />
  <input type="hidden" name="table" value={explorer.table} />
  <input type="hidden" name="columns" value={JSON.stringify(selected)} />
  <input type="hidden" name="filters" value={JSON.stringify(filters)} />
  <div class="dump-search">
    <div class="onagre-field">
      <label for="row-search">Rechercher dans les lignes</label>
      <input
        id="row-search"
        class="fr-input"
        name="search"
        bind:value={search}
        maxlength="200"
        placeholder="Dans toutes les colonnes…"
      />
    </div>
    <DumpColumns columns={explorer.columns} {selected} />
    <button class="fr-btn fr-btn--secondary" disabled={pending}
      >{pending ? "Recherche…" : "Rechercher"}</button
    >
  </div>
  <div class="dump-filters">
    <div class="dump-filter-actions">
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={filters.length >= maxFilters}
        onclick={() => {
          filters = [...filters, { column: explorer.columns[0], operator: "eq", value: "" }];
        }}>Ajouter un filtre</button
      >
      {#if filters.length > 0}
        <span class="onagre-context">Toutes les conditions doivent être vraies.</span>
        <a
          href={dumpLink(currentUrl, { filters: null, column: null, row: null, rowsPage: null })}
          onclick={() => {
            filters = [];
            error = null;
          }}>Effacer les filtres</a
        >
      {/if}
    </div>
    {#each filters as _, index}
      <DumpFilterRow
        columns={explorer.columns}
        bind:filter={filters[index]}
        {index}
        onRemove={() => {
          filters = filters.filter((_, i) => i !== index);
        }}
      />
    {/each}
    {#if filters.length > 0}
      <div class="dump-filter-actions">
        <button class="fr-btn" disabled={pending}>Appliquer les filtres</button>
        <span class="onagre-context"
          >NULL est une valeur absente. « Différent de » exclut les valeurs NULL.</span
        >
      </div>
    {/if}
    {#if error}<p role="alert" class="dump-filter-error">{error}</p>{/if}
  </div>
</form>
