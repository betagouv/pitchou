<script lang="ts">
  import type { ModificationEspeceAdmin } from "$lib/actions/adminEspeces.ts";
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
    modifications,
    filteredCount,
    onSearch,
    onFilter,
    onSort,
  }: {
    query: ModificationsQuery;
    modifications: ModificationEspeceAdmin[];
    filteredCount: number;
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

<div class="flex flex-col fr-mt-2w gap-4">
  <div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(event) => event.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-label" for="recherche-modification">Rechercher une modification</label>
        <input
          value={query.searchText}
          oninput={(event) => onSearch(event.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="CD_REF, nom scientifique ou vernaculaire"
          id="recherche-modification"
          type="search"
        />
        <button title="Rechercher une modification" type="submit" class="fr-btn">Rechercher</button>
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
  <p class="fr-mb-0" aria-live="polite">
    <span class="fr-text--lead">{filteredCount}</span><span class="fr-text--lg"
      >/{modifications.length} modification{modifications.length > 1 ? "s" : ""}</span
    >
  </p>
</div>
