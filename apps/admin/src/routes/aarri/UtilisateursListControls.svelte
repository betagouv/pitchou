<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import type { NiveauAARRI } from "@pitchou/types/API_Pitchou.ts";
  import type { SortKey, SortOrder, UtilisateursQuery } from "./utilisateursList.ts";
  import UtilisateursFilterPanel from "./UtilisateursFilterPanel.svelte";
  import UtilisateursSortPanel from "./UtilisateursSortPanel.svelte";
  let {
    query,
    groupes,
    onSearch,
    onFilter,
    onSort,
  }: {
    query: UtilisateursQuery;
    groupes: string[];
    onSearch: (value: string) => void;
    onFilter: (updates: { niveau?: NiveauAARRI | ""; groupe?: string }) => void;
    onSort: (sort: SortKey, order: SortOrder) => void;
  } = $props();
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  const activeFilterCount = $derived((query.niveau ? 1 : 0) + (query.groupe ? 1 : 0));
</script>

<div class="admin-list-controls">
  <ListToolbar
    id="recherche-utilisateur"
    label="Rechercher une utilisateurice"
    placeholder="Email ou nom"
    value={query.searchText}
    {onSearch}
    bind:filterOpen={filterPanelOpen}
    bind:sortOpen={sortPanelOpen}
    filterCount={activeFilterCount}
  />
  {#if filterPanelOpen}<UtilisateursFilterPanel
      selectedNiveau={query.niveau}
      selectedGroupe={query.groupe}
      {groupes}
      onChange={onFilter}
    />{/if}
  {#if sortPanelOpen}<UtilisateursSortPanel
      selectedSort={query.sort}
      sortOrder={query.order}
      onChange={onSort}
    />{/if}
</div>
