<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import type {
    EtatFilter,
    ListeFilter,
    ModificationSortKey,
    ModificationsQuery,
    SortOrder,
  } from "./adminModificationsList.ts";
  import ModificationsFilterPanel from "./ModificationsFilterPanel.svelte";
  import ModificationsSortPanel from "./ModificationsSortPanel.svelte";
  let {
    query,
    onSearch,
    onFilter,
    onSort,
  }: {
    query: ModificationsQuery;
    onSearch: (value: string) => void;
    onFilter: (updates: {
      classification?: string;
      statut?: string;
      etat?: EtatFilter;
      liste?: ListeFilter;
    }) => void;
    onSort: (sort: ModificationSortKey, order: SortOrder) => void;
  } = $props();
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  const activeFilterCount = $derived(
    (query.classification ? 1 : 0) +
      (query.statut ? 1 : 0) +
      (query.etat ? 1 : 0) +
      (query.liste ? 1 : 0),
  );
</script>

<div class="admin-list-controls">
  <div class="flex flex-col gap-2">
    <ListToolbar
      id="recherche-modification"
      label="Rechercher une modification"
      placeholder="CD_REF, nom scientifique ou vernaculaire"
      value={query.searchText}
      {onSearch}
      bind:filterOpen={filterPanelOpen}
      bind:sortOpen={sortPanelOpen}
      filterCount={activeFilterCount}
    />
    {#if filterPanelOpen}<ModificationsFilterPanel
        selectedClassification={query.classification}
        selectedStatut={query.statut}
        selectedEtat={query.etat}
        selectedListe={query.liste}
        onChange={onFilter}
      />{/if}
    {#if sortPanelOpen}<ModificationsSortPanel
        selectedSort={query.sort}
        sortOrder={query.order}
        onChange={onSort}
      />{/if}
  </div>
</div>
