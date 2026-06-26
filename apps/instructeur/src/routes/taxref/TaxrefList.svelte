<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    parseTaxrefQuery,
    fetchTaxrefPage,
    fetchTaxrefFiltres,
    TAXREF_PAGE_SIZE,
    type TaxrefRow,
    type TaxrefFiltres,
    type SortKey,
    type SortOrder,
  } from "@pitchou/ui/taxref/taxrefList.ts";
  import TaxrefFilterPanel from "@pitchou/ui/taxref/TaxrefFilterPanel.svelte";
  import TaxrefSortPanel from "@pitchou/ui/taxref/TaxrefSortPanel.svelte";
  import TaxrefTable from "./TaxrefTable.svelte";

  const query = $derived(parseTaxrefQuery(page.url.searchParams));

  let rows = $state<TaxrefRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let erreur = $state<string | null>(null);

  let filtres = $state<TaxrefFiltres | null>(null);
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  // Discards out-of-order responses: only the latest request may update the table.
  let requestId = 0;
  // Debounces the text search so typing fires one request, not one per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  // Refetch whenever the URL-derived query changes (also runs once on mount).
  $effect(() => {
    const current = query;
    const id = ++requestId;
    loading = true;
    erreur = null;
    fetchTaxrefPage(current)
      .then((res) => {
        if (id !== requestId) return;
        rows = res.rows;
        total = res.total;
        loading = false;
      })
      .catch((e) => {
        if (id !== requestId) return;
        erreur = e instanceof Error ? e.message : String(e);
        loading = false;
      });
  });

  const pageCount = $derived(Math.max(1, Math.ceil(total / TAXREF_PAGE_SIZE)));
  const currentPage = $derived(Math.min(query.page, pageCount));

  const activeFilterCount = $derived((query.regne ? 1 : 0) + (query.classe ? 1 : 0));

  const pageText = $derived(
    query.searchText.trim()
      ? `Résultats pour «${query.searchText}» : page ${currentPage} sur ${pageCount}`
      : `Page ${currentPage} sur ${pageCount}`,
  );

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (pageCount <= 1) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });

  // Write the given param updates to the URL. A `null` or empty value removes the param.
  // Any change other than pagination drops the page, sending the user back to page 1.
  function updateQuery(updates: Record<string, string | null>, { resetPage = true } = {}) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (resetPage) params.delete("page");

    const search = params.toString();
    goto(search ? `?${search}` : page.url.pathname, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  function goToPage(n: number) {
    updateQuery({ page: n > 1 ? String(n) : null }, { resetPage: false });
    tick().then(() => pageTitleElement?.focus());
  }

  function onSearchInput(value: string) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateQuery({ q: value }), 250);
  }

  async function toggleFilterPanel() {
    filterPanelOpen = !filterPanelOpen;
    if (filterPanelOpen && !filtres) {
      filtres = await fetchTaxrefFiltres();
    }
  }

  function onFilterChange(updates: { regne?: string; classe?: string }) {
    updateQuery(updates);
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    updateQuery({
      tri: sort === "nomScientifique" ? null : sort,
      ordre: order === "asc" ? null : order,
    });
  }
</script>

<div class="header">
  <h1>TAXREF</h1>
  <p class="fr-text--sm intro">
    Référentiel taxonomique national (TAXREF) : recherchez un taxon par nom scientifique,
    vernaculaire ou code.
  </p>

  <div class="action-bar">
    <form onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-taxref">Rechercher un taxon</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="Nom scientifique, vernaculaire, CD_NOM ou CD_REF"
          id="recherche-taxref"
          type="search"
        />
        <button title="Rechercher un taxon" type="submit" class="fr-btn">Rechercher</button>
      </div>
    </form>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
      aria-expanded={filterPanelOpen}
      aria-controls="filter-panel-taxref"
      onclick={toggleFilterPanel}
    >
      Filtrer
      {#if activeFilterCount > 0}
        <span class="filter-count" aria-label="{activeFilterCount} filtre(s) actif(s)"
          >{activeFilterCount}</span
        >
      {/if}
      <span
        class="chevron {filterPanelOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-list-ordered fr-btn--icon-left"
      aria-expanded={sortPanelOpen}
      aria-controls="sort-panel-taxref"
      onclick={() => (sortPanelOpen = !sortPanelOpen)}
    >
      Trier
      <span
        class="chevron {sortPanelOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
  </div>

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

  <div class="count-and-page">
    <p class="count" data-testid="compteur-taxref" aria-live="polite">
      <span class="fr-text--lead">{total.toLocaleString("fr-FR")}</span><span class="fr-text--lg"
        >&nbsp;{total > 1 ? "résultats" : "résultat"}</span
      >
    </p>
    <h2 bind:this={pageTitleElement} tabindex="-1" class="page-title">{pageText}</h2>
  </div>
</div>

{#if erreur}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement de TAXREF</h3>
    <p>{erreur}</p>
  </div>
{:else}
  <div class:loading>
    <TaxrefTable {rows} />
  </div>
{/if}

{#if pageSelectors}
  <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
{/if}

<style lang="scss">
  .header {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
    gap: 1rem;

    h1 {
      margin-bottom: 0;
    }

    .intro {
      margin-bottom: 0;
      color: var(--text-mention-grey);
    }

    .action-bar {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 1rem;

      form {
        flex: 1;
      }

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }

      .chevron {
        margin-left: 0.25rem;
      }

      .chevron::before {
        --icon-size: 1rem;
      }

      .filter-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.25rem;
        height: 1.25rem;
        margin-left: 0.25rem;
        padding: 0 0.25rem;
        border-radius: 0.625rem;
        background-color: var(--background-action-high-blue-france);
        color: var(--text-inverted-blue-france);
        font-size: 0.75rem;
        line-height: 1;
      }
    }

    .count-and-page {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: baseline;
      gap: 1rem;
    }

    .count {
      margin-bottom: 0;
    }
  }

  .search-bar {
    width: 100%;
  }

  .page-title {
    font-size: 1rem;
    font-weight: normal;
    margin-bottom: 0;
  }

  .page-title:focus {
    outline: 2px solid var(--bf500);
    outline-offset: 2px;
  }

  // While a request is in flight, dim the current rows instead of clearing them.
  .loading {
    opacity: 0.5;
    transition: opacity 0.15s ease;
  }
</style>
