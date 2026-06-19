<script lang="ts">
  import DossiersFilterPanel from "./DossiersFilterPanel.svelte";
  import DossiersSortPanel from "./DossiersSortPanel.svelte";
  import {
    countActiveFilters,
    buildClearFiltersUpdates,
    type DossiersQuery,
    type DepartementOption,
    type ActivitePrincipale,
    type SortKey,
    type SortOrder,
  } from "./dossiersList.ts";

  type Props = {
    query: DossiersQuery;
    availableActivites: ActivitePrincipale[];
    availableDepartements: DepartementOption[];
    availableInstructeurs: string[];
    showInstructeurFilter: boolean;
    showActionInstructeurFilter: boolean;
    statusMessage: string;
    // Live, on every keystroke: updates the URL (filter-as-you-type), no analytics
    onSearchInput: (text: string) => void;
    // On commit (blur / Enter): worth logging as a search the user performed
    onSearchCommit: (text: string) => void;
    onFilterChange: (updates: Record<string, string | string[] | null>) => void;
    onSortChange: (sort: SortKey, order: SortOrder) => void;
  };

  let {
    query,
    availableActivites,
    availableDepartements,
    availableInstructeurs,
    showInstructeurFilter,
    showActionInstructeurFilter,
    statusMessage,
    onSearchInput,
    onSearchCommit,
    onFilterChange,
    onSortChange,
  }: Props = $props();

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  const activeFilterCount = $derived(countActiveFilters(query));
</script>

<div class="action-bar">
  <form onsubmit={(e) => e.preventDefault()}>
    <div class="fr-search-bar search-bar" role="search">
      <label class="fr-label" for="search-input">Rechercher un dossier</label>
      <input
        value={query.text}
        oninput={(e) => onSearchInput(e.currentTarget.value)}
        onchange={(e) => onSearchCommit(e.currentTarget.value)}
        name="texte-de-recherche"
        class="fr-input"
        aria-describedby="search-input-messages"
        placeholder="Rechercher"
        id="search-input"
        type="search"
      />
      <button title="Rechercher un dossier" type="submit" class="fr-btn"
        >Rechercher un dossier</button
      >
    </div>
  </form>
  {#if activeFilterCount > 0}
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-circle-line fr-btn--icon-left clear-filters"
      onclick={() => onFilterChange(buildClearFiltersUpdates())}
    >
      Effacer les filtres
    </button>
  {/if}
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
  {#if statusMessage}
    {statusMessage}
  {/if}
</div>

{#if filterPanelOpen}
  <DossiersFilterPanel
    {query}
    activitesDisponibles={availableActivites}
    departementsDisponibles={availableDepartements}
    instructeursDisponibles={availableInstructeurs}
    {showInstructeurFilter}
    {showActionInstructeurFilter}
    onChange={onFilterChange}
  />
{/if}

{#if sortPanelOpen}
  <DossiersSortPanel selectedSort={query.sort} sortOrder={query.order} onChange={onSortChange} />
{/if}

<style lang="scss">
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

    .clear-filters {
      white-space: nowrap;
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

  .search-bar {
    width: 100%;
  }
</style>
