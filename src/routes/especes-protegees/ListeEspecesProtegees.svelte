<script lang="ts">
  import type { EventHandler } from "svelte/elements";
  import { SvelteMap } from "svelte/reactivity";
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { EspèceProtégée, ClassificationEtreVivant } from "$types/especes.d.ts";
  import Pagination from "$front/components/DSFR/Pagination.svelte";

  import {
    matchesText,
    compareEspeces,
    CLASSIFICATIONS,
    STATUTS,
    type FilterKey,
    type SortKey,
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

  const allFilters = new SvelteMap<FilterKey, (espece: EspèceProtégée) => boolean>();

  let searchText: string | undefined = $state();
  let selectedClassification: ClassificationEtreVivant | "" = $state("");
  let selectedStatut: Statut | "" = $state("");
  let selectedListe: ListeFilter = $state("");

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  /** Number of active filters excluding the text search (shown on the « Filtrer » button) */
  const activeFilterCount = $derived([...allFilters.keys()].filter((key) => key !== "text").length);

  let selectedSort: SortKey = $state("nomScientifique");
  let sortOrder: "asc" | "desc" = $state("asc");

  let currentPage = $state(1);
  let statusMessage = $state("");
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  const filteredEspeces = $derived.by(() => {
    let result = especes;
    for (const filter of allFilters.values()) {
      result = result.filter(filter);
    }
    return result;
  });

  const pageCount = $derived(
    filteredEspeces.length === 0 ? 1 : Math.ceil(filteredEspeces.length / ESPECES_PER_PAGE),
  );

  type PageSelector = () => void;
  let pageSelectors: undefined | [undefined, ...rest: PageSelector[]] = $derived.by(() => {
    if (filteredEspeces.length >= ESPECES_PER_PAGE + 1) {
      const selectors: PageSelector[] = Array.from({ length: pageCount }, (_v, i) => () => {
        currentPage = i + 1;
        tick().then(() => pageTitleElement?.focus());
      });
      return [undefined, ...selectors];
    }
    return undefined;
  });

  const displayedEspeces = $derived.by(() => {
    const sorted = [...filteredEspeces].sort((a, b) =>
      compareEspeces(a, b, selectedSort, sortOrder),
    );
    if (!pageSelectors) return sorted;
    return sorted.slice(ESPECES_PER_PAGE * (currentPage - 1), ESPECES_PER_PAGE * currentPage);
  });

  const pageText = $derived.by(() => {
    if (allFilters.has("text") && searchText && searchText.trim() !== "") {
      return `Résultats de recherche pour «${searchText}» : Page ${currentPage} sur ${pageCount}`;
    }
    return `Page ${currentPage} sur ${pageCount}`;
  });

  function resetPage() {
    currentPage = 1;
    statusMessage = `${filteredEspeces.length} espèces affichées sur ${especes.length}`;
    setTimeout(() => {
      statusMessage = "";
    }, 400);
  }

  function applyTextSearch() {
    if (!searchText || searchText.trim() === "") {
      allFilters.delete("text");
    } else {
      const text = searchText;
      allFilters.set("text", (espece) => matchesText(espece, text));
    }
    resetPage();
  }

  const submitTextSearch: EventHandler<SubmitEvent, HTMLFormElement> = (e) => {
    e.preventDefault();
    applyTextSearch();
  };

  function applyFilters() {
    const classification = selectedClassification;
    if (classification) {
      allFilters.set("classification", (espece) => espece.classification === classification);
    } else {
      allFilters.delete("classification");
    }

    const statut = selectedStatut;
    if (statut) {
      allFilters.set("statut", (espece) => espece.CD_TYPE_STATUTS.has(statut));
    } else {
      allFilters.delete("statut");
    }

    if (selectedListe === "ministerielle") {
      allFilters.set("list", (espece) => espece.espèceMinistérielle === "O");
    } else if (selectedListe === "cnpn") {
      allFilters.set("list", (espece) => espece.espèceCNPN === "O");
    } else {
      allFilters.delete("list");
    }

    resetPage();
  }
</script>

<div class="header">
  <h1>Espèces protégées</h1>

  <div class="action-bar">
    <form onsubmit={submitTextSearch}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-espece">Rechercher une espèce</label>
        <input
          bind:value={searchText}
          oninput={applyTextSearch}
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

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if statusMessage}{statusMessage}{/if}
  </div>

  {#if filterPanelOpen}
    <EspecesFilterPanel
      bind:selectedClassification
      bind:selectedStatut
      bind:selectedListe
      onChange={applyFilters}
    />
  {/if}

  {#if sortPanelOpen}
    <EspecesSortPanel bind:selectedSort bind:sortOrder onChange={resetPage} />
  {/if}

  <div class="count-and-page">
    <p class="count" data-testid="compteur-especes">
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
