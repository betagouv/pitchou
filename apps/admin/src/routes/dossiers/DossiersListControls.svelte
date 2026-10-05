<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import type {
    DossiersQuery,
    DossierSortKey,
    DossierSortOrder,
  } from "$lib/actions/adminDossierTypes.ts";
  import DossiersFilterPanel from "./DossiersFilterPanel.svelte";
  import DossiersSortPanel from "./DossiersSortPanel.svelte";

  let {
    query,
    total,
    loading,
    onSearch,
    onFilter,
    onSort,
  }: {
    query: DossiersQuery;
    total: number;
    loading: boolean;
    onSearch: (value: string) => void;
    onFilter: (updates: { phase?: string; source?: DossiersQuery["source"] }) => void;
    onSort: (sort: DossierSortKey, order: DossierSortOrder) => void;
  } = $props();

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  const activeFilterCount = $derived((query.phase ? 1 : 0) + (query.source ? 1 : 0));
</script>

<div class="admin-list-controls">
  <div class="flex flex-col gap-2">
    <ListToolbar
      id="recherche-dossier"
      label="Rechercher un dossier"
      placeholder="Nom, demandeur ou numéro DN"
      value={query.search}
      {onSearch}
      bind:filterOpen={filterPanelOpen}
      bind:sortOpen={sortPanelOpen}
      filterCount={activeFilterCount}
    />
    {#if filterPanelOpen}<DossiersFilterPanel
        selectedPhase={query.phase}
        selectedSource={query.source}
        onChange={onFilter}
      />{/if}
    {#if sortPanelOpen}<DossiersSortPanel
        selectedSort={query.sort}
        sortOrder={query.order}
        onChange={onSort}
      />{/if}
    <p class="list-status" aria-live="polite">
      <span class="font-semibold">{total}</span><span class="text-sm"
        >&nbsp;dossier{total > 1 ? "s" : ""}</span
      >
      {#if loading}
        <span class="fr-text--sm fr-text-mention--grey fr-ml-1w">— chargement…</span>
      {/if}
    </p>
  </div>
</div>
