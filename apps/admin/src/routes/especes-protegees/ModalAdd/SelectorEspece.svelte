<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import type { EspeceProtegee, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import Pagination from "$lib/components/ListPagination.svelte";

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
    uicn: "",
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

<div class="admin-list-controls">
  <div class="flex flex-col gap-4 fr-p-3w">
    <ListToolbar
      id="recherche-espece-ajout"
      label="Rechercher une espèce"
      placeholder="Nom scientifique, vernaculaire ou CD_REF"
      value={query.searchText}
      onSearch={onSearchInput}
      bind:filterOpen={filterPanelOpen}
      bind:sortOpen={sortPanelOpen}
      filterCount={activeFilterCount}
      filterId="filter-panel-especes"
      sortId="sort-panel-especes"
    />

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

    <p class="list-status" aria-live="polite">
      <span class="font-semibold">{filtered.length}</span><span class="text-sm"
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
</div>
