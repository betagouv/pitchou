<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { EspèceProtégée, ClassificationEtreVivant } from "$types/especes.d.ts";
  import Pagination from "$front/components/DSFR/Pagination.svelte";

  import {
    parseEspecesQuery,
    filterEspeces,
    compareEspeces,
    type SortKey,
    type SortOrder,
    type Statut,
    type ListeFilter,
  } from "./especesList.ts";
  import EspecesFilterPanel from "./EspecesFilterPanel.svelte";
  import EspecesSortPanel from "./EspecesSortPanel.svelte";
  import EspecesTable from "./EspecesTable.svelte";

  type Props = {
    especes: EspèceProtégée[];
  };

  let { especes }: Props = $props();

  const ESPECES_PER_PAGE = 20;

  // The URL query string is the single source of truth for search, filters, sort and page.
  const query = $derived(parseEspecesQuery(page.url.searchParams));

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  /** Number of active filters excluding the text search (shown on the « Filtrer » button) */
  const activeFilterCount = $derived(
    (query.classification ? 1 : 0) + (query.statut ? 1 : 0) + (query.liste ? 1 : 0),
  );

  const filteredEspeces = $derived(filterEspeces(especes, query));

  const pageCount = $derived(Math.max(1, Math.ceil(filteredEspeces.length / ESPECES_PER_PAGE)));
  // Clamp in case the URL points past the last page (e.g. after narrowing the filters)
  const currentPage = $derived(Math.min(query.page, pageCount));

  const paginated = $derived(filteredEspeces.length > ESPECES_PER_PAGE);

  const displayedEspeces = $derived.by(() => {
    const sorted = [...filteredEspeces].sort((a, b) =>
      compareEspeces(a, b, query.sort, query.order),
    );
    if (!paginated) return sorted;
    return sorted.slice(ESPECES_PER_PAGE * (currentPage - 1), ESPECES_PER_PAGE * currentPage);
  });

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (!paginated) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });

  const pageText = $derived(
    query.searchText.trim()
      ? `Résultats de recherche pour «${query.searchText}» : Page ${currentPage} sur ${pageCount}`
      : `Page ${currentPage} sur ${pageCount}`,
  );

  // Write the given param updates to the URL. A `null` or empty value removes the param.
  // Any change other than pagination drops the page, sending the user back to the first one.
  function updateQuery(updates: Record<string, string | null>, { resetPage = true } = {}) {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    if (resetPage) {
      params.delete("page");
    }

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
    updateQuery({ q: value });
  }

  function onFilterChange(updates: {
    classification?: ClassificationEtreVivant | "";
    statut?: Statut | "";
    liste?: ListeFilter;
  }) {
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
  <h1>Espèces protégées</h1>

  <div class="action-bar">
    <form onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-espece">Rechercher une espèce</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="Nom scientifique ou vernaculaire"
          id="recherche-espece"
          type="search"
        />
        <button title="Rechercher une espèce" type="submit" class="fr-btn">Rechercher</button>
      </div>
    </form>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
      aria-expanded={filterPanelOpen}
      aria-controls="panneau-filtres"
      onclick={() => (filterPanelOpen = !filterPanelOpen)}
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
      aria-controls="panneau-tri"
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

  <div class="count-and-page">
    <p class="count" data-testid="compteur-especes" aria-live="polite">
      <span class="fr-text--lead">{filteredEspeces.length}</span><span class="fr-text--lg"
        >/{especes.length} espèces</span
      >
    </p>
    <h2 bind:this={pageTitleElement} tabindex="-1" class="page-title">{pageText}</h2>
  </div>
</div>

<EspecesTable especes={displayedEspeces} />

{#if pageSelectors}
  <Pagination selectionneursPage={pageSelectors} pageActuelle={pageSelectors[currentPage]} />
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
</style>
