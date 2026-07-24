<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { EspeceProtegee, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    parseEspecesQuery,
    filterEspeces,
    compareEspeces,
    type SortKey,
    type SortOrder,
    type Statut,
    type ListeFilter,
  } from "@pitchou/ui/especes/especesList.ts";
  import EspecesFilterPanel from "@pitchou/ui/especes/EspecesFilterPanel.svelte";
  import EspecesSortPanel from "@pitchou/ui/especes/EspecesSortPanel.svelte";
  import EspecesTable from "./EspecesTable.svelte";
  import EspecesGenerationModal from "./EspecesGenerationModal.svelte";

  type Props = {
    especes: EspeceProtegee[];
  };

  let { especes }: Props = $props();

  const ESPECES_PER_PAGE = 20;

  const generationModalId = "modale-generation-especes";

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

<div class="flex flex-col fr-mt-2w gap-4">
  <div class="flex flex-row justify-between items-center gap-4 flex-wrap">
    <h1 class="fr-mb-0">Espèces protégées</h1>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-information-line fr-btn--icon-left"
      aria-controls={generationModalId}
      data-fr-opened="false"
    >
      Comment cette liste est générée&nbsp;?
    </button>
  </div>

  <div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
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

  <div class="flex flex-row justify-between items-baseline gap-4">
    <p class="fr-mb-0" data-testid="compteur-especes" aria-live="polite">
      <span class="fr-text--lead">{filteredEspeces.length}</span><span class="fr-text--lg"
        >/{especes.length} espèces</span
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

<EspecesTable especes={displayedEspeces} />

{#if pageSelectors}
  <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
{/if}

<EspecesGenerationModal id={generationModalId} />
