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

<div class="flex flex-col fr-mt-2w gap-4">
  <h1 class="fr-mb-0">TAXREF</h1>
  <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
    Référentiel taxonomique national (TAXREF) : recherchez un taxon par nom scientifique,
    vernaculaire ou code.
  </p>

  <div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
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
      aria-controls="sort-panel-taxref"
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

  <div class="flex flex-row justify-between items-baseline gap-4">
    <p class="fr-mb-0" data-testid="compteur-taxref" aria-live="polite">
      <span class="fr-text--lead">{total.toLocaleString("fr-FR")}</span><span class="fr-text--lg"
        >&nbsp;{total > 1 ? "résultats" : "résultat"}</span
      >
    </p>
    <h2
      bind:this={pageTitleElement}
      tabindex="-1"
      class="text-[1rem] fr-text--regular fr-mb-0 focus:[outline:2px_solid_var(--bf500)] focus:[outline-offset:2px]"
    >
      {pageText}
    </h2>
  </div>
</div>

{#if erreur}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement de TAXREF</h3>
    <p>{erreur}</p>
  </div>
{:else}
  <!-- While a request is in flight, dim the current rows instead of clearing them. -->
  <div class={loading ? "opacity-50 [transition:opacity_0.15s_ease]" : ""}>
    <TaxrefTable {rows} />
  </div>
{/if}

{#if pageSelectors}
  <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
{/if}
