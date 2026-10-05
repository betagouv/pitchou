<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import Loader from "@pitchou/ui/Loader.svelte";
  import Pagination from "$lib/components/ListPagination.svelte";

  import {
    fetchTaxrefPage,
    fetchTaxrefFiltres,
    TAXREF_PAGE_SIZE,
    type TaxrefRow,
    type TaxrefQuery,
    type TaxrefFiltres,
    type SortKey,
    type SortOrder,
  } from "@pitchou/ui/taxref/taxrefList.ts";
  import TaxrefFilterPanel from "@pitchou/ui/taxref/TaxrefFilterPanel.svelte";
  import TaxrefSortPanel from "@pitchou/ui/taxref/TaxrefSortPanel.svelte";
  import TaxrefSelectionTable from "./TaxrefSelectionTable.svelte";

  type Props = {
    /** CD_REFs already protected: flagged "déjà dans la liste" and not selectable. */
    existingCdRefs: Set<string>;
    onSelect: (row: TaxrefRow) => void;
  };

  let { existingCdRefs, onSelect }: Props = $props();

  let query = $state<TaxrefQuery>({
    searchText: "",
    regne: "",
    classe: "",
    sort: "nomScientifique",
    order: "asc",
    page: 1,
  });

  let rows = $state<TaxrefRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let filtres = $state<TaxrefFiltres | null>(null);
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  // Discards out-of-order responses: only the latest request may update the table.
  let requestId = 0;
  // Debounces the text search so typing fires one request, not one per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const current = $state.snapshot(query) as TaxrefQuery;
    const id = ++requestId;
    loading = true;
    error = null;
    fetchTaxrefPage(current)
      .then((res) => {
        if (id !== requestId) return;
        rows = res.rows;
        total = res.total;
        loading = false;
      })
      .catch((e) => {
        if (id !== requestId) return;
        error = e instanceof Error ? e.message : String(e);
        loading = false;
      });
  });

  const pageCount = $derived(Math.max(1, Math.ceil(total / TAXREF_PAGE_SIZE)));
  const currentPage = $derived(Math.min(query.page, pageCount));
  const activeFilterCount = $derived((query.regne ? 1 : 0) + (query.classe ? 1 : 0));

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (pageCount <= 1) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => (query.page = i + 1));
    return [undefined, ...selectors];
  });

  function onSearchInput(value: string) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query.searchText = value;
      query.page = 1;
    }, 250);
  }

  async function toggleFilterPanel() {
    filterPanelOpen = !filterPanelOpen;
    if (filterPanelOpen && !filtres) filtres = await fetchTaxrefFiltres();
  }

  function onFilterChange(updates: { regne?: string; classe?: string }) {
    query = { ...query, ...updates, page: 1 };
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    query.sort = sort;
    query.order = order;
    query.page = 1;
  }
</script>

<div class="admin-list-controls">
  <div class="flex flex-col gap-4 fr-p-3w">
    <ListToolbar
      id="recherche-taxref-ajout"
      label="Rechercher un taxon"
      placeholder="Nom scientifique, vernaculaire, CD_NOM ou CD_REF"
      value={query.searchText}
      onSearch={onSearchInput}
      bind:filterOpen={filterPanelOpen}
      bind:sortOpen={sortPanelOpen}
      filterCount={activeFilterCount}
      filterId="filter-panel-taxref"
      sortId="sort-panel-taxref"
      onToggleFilter={toggleFilterPanel}
    />

    {#if filterPanelOpen}
      <TaxrefFilterPanel
        {filtres}
        selectedRegne={query.regne}
        selectedClasse={query.classe}
        onChange={onFilterChange}
      />
    {/if}

    {#if sortPanelOpen}
      <TaxrefSortPanel selectedSort={query.sort} sortOrder={query.order} onChange={onSortChange} />
    {/if}

    <p class="list-status" aria-live="polite">
      <span class="font-semibold">{total.toLocaleString("fr-FR")}</span><span class="text-sm"
        >&nbsp;{total > 1 ? "taxons" : "taxon"}</span
      >
    </p>

    {#if error}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{error}</p>
      </div>
    {:else if loading && rows.length === 0}
      <Loader />
    {:else if rows.length >= 1}
      <TaxrefSelectionTable {rows} {existingCdRefs} {loading} {onSelect} />

      {#if pageSelectors}
        <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
      {/if}
    {:else}
      <p>Aucun taxon ne correspond à cette recherche.</p>
    {/if}
  </div>
</div>
