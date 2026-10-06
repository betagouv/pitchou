<script lang="ts">
  import ListToolbar from "$lib/components/ListToolbar.svelte";
  import { onMount } from "svelte";

  import Pagination from "$lib/components/ListPagination.svelte";

  import {
    loadEvenements,
    defaultEvenementsQuery,
    type EvenementsQuery,
    type EvenementMetriqueRow,
    type EvenementSortKey,
    type EvenementSortOrder,
  } from "$lib/actions/adminEvenements.ts";
  import EvenementsFilterPanel from "./EvenementsFilterPanel.svelte";
  import EvenementsSortPanel from "./EvenementsSortPanel.svelte";
  import TableEvenements from "./TableEvenements.svelte";

  type Props = {
    types: string[];
  };

  let { types }: Props = $props();

  let query = $state<EvenementsQuery>(defaultEvenementsQuery());
  let evenements = $state<EvenementMetriqueRow[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  // Monotonic request id: only the latest in-flight response is allowed to win,
  // so a slow earlier request can never overwrite a newer one.
  let requestId = 0;

  const pageCount = $derived(Math.max(1, Math.ceil(total / query.pageSize)));
  const paginated = $derived(pageCount > 1);

  const activeFilterCount = $derived(
    (query.evenements.length > 0 ? 1 : 0) + (query.dateFrom ? 1 : 0) + (query.dateTo ? 1 : 0),
  );

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (!paginated) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });
  const currentPageSelector = $derived(pageSelectors ? pageSelectors[query.page] : undefined);

  async function reload() {
    const id = ++requestId;
    loading = true;
    loadError = null;
    try {
      const page = await loadEvenements(query);
      if (id !== requestId) return; // A newer request superseded this one.
      evenements = page.evenements;
      total = page.total;
    } catch (e) {
      if (id !== requestId) return;
      loadError = e instanceof Error ? e.message : String(e);
      evenements = [];
      total = 0;
    } finally {
      if (id === requestId) loading = false;
    }
  }

  function goToPage(page: number) {
    query.page = page;
    reload();
  }

  // Debounce the free-text search so we fire one request when typing settles,
  // not one per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearchInput(value: string) {
    query.search = value;
    query.page = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(reload, 300);
  }

  function onFilterChange(updates: { evenements?: string[]; dateFrom?: string; dateTo?: string }) {
    query = { ...query, ...updates, page: 1 };
    reload();
  }

  function onSortChange(sort: EvenementSortKey, order: EvenementSortOrder) {
    query = { ...query, sort, order, page: 1 };
    reload();
  }

  onMount(reload);
</script>

<div class="admin-list-controls">
  <div class="flex flex-col gap-2">
    <ListToolbar
      id="recherche-evenement"
      label="Rechercher un évènement"
      placeholder="Adresse e-mail de l'utilisateur"
      value={query.search}
      onSearch={onSearchInput}
      bind:filterOpen={filterPanelOpen}
      bind:sortOpen={sortPanelOpen}
      filterCount={activeFilterCount}
    />

    {#if filterPanelOpen}
      <EvenementsFilterPanel
        {types}
        selectedTypes={query.evenements}
        dateFrom={query.dateFrom}
        dateTo={query.dateTo}
        onChange={onFilterChange}
      />
    {/if}

    {#if sortPanelOpen}
      <EvenementsSortPanel
        selectedSort={query.sort}
        sortOrder={query.order}
        onChange={onSortChange}
      />
    {/if}

    {#if loading}<p class="list-status" role="status">Chargement des évènements…</p>{/if}
  </div>

  {#if loadError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
      <p>{loadError}</p>
    </div>
  {/if}

  {#if evenements.length >= 1}
    <TableEvenements {total} rows={evenements} />

    {#if pageSelectors}
      <div class="mt-2">
        <Pagination {pageSelectors} currentPage={currentPageSelector} />
      </div>
    {/if}
  {:else if !loading}
    <p>Aucun évènement ne correspond à cette recherche.</p>
  {/if}
</div>
