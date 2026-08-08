<script lang="ts">
  import type { EspeceProtegee, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    filterEspeces,
    compareEspeces,
    type EspecesQuery,
    type SortKey,
    type SortOrder,
    type Statut,
    type ListeFilter,
  } from "@pitchou/ui/especes/especesList.ts";
  import EspecesFilterPanel from "@pitchou/ui/especes/EspecesFilterPanel.svelte";
  import EspecesSortPanel from "@pitchou/ui/especes/EspecesSortPanel.svelte";
  import EspeceSelectionTable from "./EspeceSelectionTable.svelte";

  type Props = {
    especes: EspeceProtegee[];
    /** CD_REFs already covered by a modification: flagged as "déjà dans la liste". */
    existingCdRefs: Set<string>;
    onSelect: (espece: EspeceProtegee) => void;
  };

  let { especes, existingCdRefs, onSelect }: Props = $props();

  const PAGE_SIZE = 10;

  let query = $state<EspecesQuery>({
    searchText: "",
    classification: "",
    statut: "",
    liste: "",
    sort: "nomScientifique",
    order: "asc",
    page: 1,
  });
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  const activeFilterCount = $derived(
    (query.classification ? 1 : 0) + (query.statut ? 1 : 0) + (query.liste ? 1 : 0),
  );

  const filtered = $derived(filterEspeces(especes, query));
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const currentPage = $derived(Math.min(query.page, pageCount));

  const displayed = $derived.by(() => {
    const sorted = [...filtered].sort((a, b) => compareEspeces(a, b, query.sort, query.order));
    return sorted.slice(PAGE_SIZE * (currentPage - 1), PAGE_SIZE * currentPage);
  });

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (pageCount <= 1) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => (query.page = i + 1));
    return [undefined, ...selectors];
  });

  function onSearchInput(value: string) {
    query.searchText = value;
    query.page = 1;
  }

  function onFilterChange(updates: {
    classification?: ClassificationEtreVivant | "";
    statut?: Statut | "";
    liste?: ListeFilter;
  }) {
    query = { ...query, ...updates, page: 1 };
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    query.sort = sort;
    query.order = order;
  }
</script>

<div class="flex flex-col gap-4 fr-p-3w">
  <div class="flex flex-row items-start gap-3 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-label" for="recherche-espece-existante">Rechercher une espèce</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          class="fr-input"
          placeholder="Nom scientifique ou vernaculaire"
          id="recherche-espece-existante"
          type="search"
        />
        <button title="Rechercher une espèce" type="submit" class="fr-btn">Rechercher</button>
      </div>
    </form>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
      aria-expanded={filterPanelOpen}
      aria-controls="filter-panel-especes"
      onclick={() => (filterPanelOpen = !filterPanelOpen)}
    >
      Filtrer
      {#if activeFilterCount > 0}
        <span
          class="inline-flex items-center justify-center min-w-5 h-5 fr-ml-1v fr-py-0 fr-px-1v rounded-[0.625rem] bg-[var(--background-action-high-blue-france)] text-[color:var(--text-inverted-blue-france)] text-[0.75rem] leading-none"
          aria-label="{activeFilterCount} filtre(s) actif(s)">{activeFilterCount}</span
        >
      {/if}
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
      aria-controls="sort-panel-especes"
      onclick={() => (sortPanelOpen = !sortPanelOpen)}
    >
      Trier
      <span
        class="fr-ml-1v before:[--icon-size:1rem] {sortPanelOpen
          ? 'fr-icon-arrow-up-s-line'
          : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
  </div>

  {#if filterPanelOpen}
    <EspecesFilterPanel
      selectedClassification={query.classification}
      selectedStatut={query.statut}
      selectedListe={query.liste}
      onChange={onFilterChange}
    />
  {/if}

  {#if sortPanelOpen}
    <EspecesSortPanel selectedSort={query.sort} sortOrder={query.order} onChange={onSortChange} />
  {/if}

  <p class="fr-m-0" aria-live="polite">
    <span class="fr-text--lead">{filtered.length}</span><span class="fr-text--lg"
      >/{especes.length} espèces</span
    >
  </p>

  {#if displayed.length >= 1}
    <EspeceSelectionTable especes={displayed} {existingCdRefs} {onSelect} />

    {#if pageSelectors}
      <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
    {/if}
  {:else}
    <p>Aucune espèce ne correspond à cette recherche.</p>
  {/if}
</div>
