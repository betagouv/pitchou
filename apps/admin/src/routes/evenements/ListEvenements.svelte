<script lang="ts">
  import { onMount } from "svelte";

  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    loadEvenements,
    defaultEvenementsQuery,
    type EvenementsQuery,
    type EvenementMetriqueRow,
  } from "$lib/actions/adminEvenements.ts";
  import EvenementsFilterPanel from "./EvenementsFilterPanel.svelte";
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

  onMount(reload);
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-row items-start gap-2 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-label" for="recherche-evenement">Rechercher un évènement</label>
        <input
          value={query.search}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="Adresse e-mail de l'utilisateur"
          id="recherche-evenement"
          type="search"
        />
        <button title="Rechercher un évènement" type="submit" class="fr-btn">Rechercher</button>
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
  </div>

  {#if filterPanelOpen}
    <EvenementsFilterPanel
      {types}
      selectedTypes={query.evenements}
      dateFrom={query.dateFrom}
      dateTo={query.dateTo}
      onChange={onFilterChange}
    />
  {/if}

  <p class="fr-mb-0" aria-live="polite">
    <span class="fr-text--lead">{total}</span><span class="fr-text--lg"
      >&nbsp;évènement{total > 1 ? "s" : ""}</span
    >
    {#if loading}
      <span class="fr-text--sm fr-text-mention--grey fr-ml-1w">— chargement…</span>
    {/if}
  </p>
</div>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
    <p>{loadError}</p>
  </div>
{/if}

{#if evenements.length >= 1}
  <TableEvenements rows={evenements} />

  {#if pageSelectors}
    <div class="mt-2">
      <Pagination {pageSelectors} currentPage={currentPageSelector} />
    </div>
  {/if}
{:else if !loading}
  <p>Aucun évènement ne correspond à cette recherche.</p>
{/if}
