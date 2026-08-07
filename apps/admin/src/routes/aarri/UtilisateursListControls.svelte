<script lang="ts">
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

<div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
  <form class="flex-1" onsubmit={(event) => event.preventDefault()}>
    <div class="fr-search-bar w-full" role="search">
      <label class="fr-label" for="recherche-utilisateur">Rechercher une utilisateurice</label>
      <input
        value={query.searchText}
        oninput={(event) => onSearch(event.currentTarget.value)}
        name="texte-de-recherche"
        class="fr-input"
        placeholder="Email ou nom"
        id="recherche-utilisateur"
        type="search"
      />
      <button title="Rechercher une utilisateurice" type="submit" class="fr-btn">Rechercher</button>
    </div>
  </form>
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
    aria-expanded={filterPanelOpen}
    aria-controls="filter-panel"
    onclick={() => (filterPanelOpen = !filterPanelOpen)}
  >
    Filtrer
    {#if activeFilterCount > 0}<span
        class="inline-flex items-center justify-center min-w-5 h-5 fr-ml-1v fr-py-0 fr-px-1v rounded-[0.625rem] bg-[var(--background-action-high-blue-france)] text-[color:var(--text-inverted-blue-france)] text-[0.75rem] leading-none"
        aria-label="{activeFilterCount} filtre(s) actif(s)">{activeFilterCount}</span
      >{/if}
    <span
      class="fr-ml-1v before:[--icon-size:1rem] {filterPanelOpen
        ? 'fr-icon-arrow-up-s-line'
        : 'fr-icon-arrow-down-s-line'}"
      aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-icon-list-ordered fr-btn--icon-left"
    aria-expanded={sortPanelOpen}
    aria-controls="sort-panel"
    onclick={() => (sortPanelOpen = !sortPanelOpen)}
  >
    Trier<span
      class="fr-ml-1v before:[--icon-size:1rem] {sortPanelOpen
        ? 'fr-icon-arrow-up-s-line'
        : 'fr-icon-arrow-down-s-line'}"
      aria-hidden="true"
    ></span>
  </button>
</div>
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
