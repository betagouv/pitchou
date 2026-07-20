<script lang="ts">
  import type { DossiersQuery, FilterChip, SortKey, SortOrder } from "./dossiersList.ts";
  import { serviceLabel } from "./dossiersList.ts";
  import DossiersSearchBar from "./DossiersSearchBar.svelte";
  import DossiersSortMenu from "./DossiersSortMenu.svelte";

  type Props = {
    title: string;
    searchText: string;
    /** Recent searches offered as suggestions when the search bar is focused */
    recentSearches: string[];
    showFilterInstructeurice: boolean;
    showFilterEnjeu: boolean;
    showFilterActionInstructeur: boolean;
    withoutInstructeurActive: boolean;
    enjeuActive: boolean;
    actionInstructeurActive: boolean;
    activeFilterCount: number;
    numberFiltered: number;
    /** Names of the instructeur's services (groupes instructeurs) */
    services: string[];
    /** Active filters shown as removable tags */
    chips: FilterChip[];
    sortKey: SortKey;
    sortOrder: SortOrder;
    onSearch: (text: string) => void;
    onToggleWithoutInstructeur: () => void;
    onToggleEnjeu: () => void;
    onToggleActionInstructeur: () => void;
    onOpenFilters: () => void;
    onRemoveFilter: (next: DossiersQuery) => void;
    onSort: (key: SortKey, order: SortOrder) => void;
  };

  let {
    title,
    searchText,
    recentSearches,
    showFilterInstructeurice,
    showFilterEnjeu,
    showFilterActionInstructeur,
    withoutInstructeurActive,
    enjeuActive,
    actionInstructeurActive,
    activeFilterCount,
    numberFiltered,
    services,
    chips,
    sortKey,
    sortOrder,
    onSearch,
    onToggleWithoutInstructeur,
    onToggleEnjeu,
    onToggleActionInstructeur,
    onOpenFilters,
    onRemoveFilter,
    onSort,
  }: Props = $props();
</script>

<div class="toolbar">
  <div class="toolbar__header">
    <h1>{title}</h1>

    <DossiersSearchBar {searchText} suggestions={recentSearches} {onSearch} />
  </div>

  <div class="toolbar__actions">
    {#if showFilterInstructeurice}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--secondary"
        aria-pressed={withoutInstructeurActive}
        class:active={withoutInstructeurActive}
        onclick={onToggleWithoutInstructeur}
      >
        Dossiers sans instructeur·ice
      </button>
    {/if}

    {#if showFilterEnjeu}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--secondary"
        aria-pressed={enjeuActive}
        class:active={enjeuActive}
        onclick={onToggleEnjeu}
      >
        Dossiers à enjeux
      </button>
    {/if}

    {#if showFilterActionInstructeur}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--secondary"
        aria-pressed={actionInstructeurActive}
        class:active={actionInstructeurActive}
        onclick={onToggleActionInstructeur}
      >
        Moi en charge de la prochaine action
      </button>
    {/if}

    <button
      type="button"
      class="fr-btn fr-btn--sm fr-icon-filter-line fr-btn--icon-left"
      onclick={onOpenFilters}
    >
      Filtres{#if activeFilterCount > 0}&nbsp;<span class="filter-counter">{activeFilterCount}</span
        >{/if}
    </button>

    <DossiersSortMenu {sortKey} {sortOrder} {onSort} />
  </div>

  {#if chips.length > 0}
    <ul class="fr-tags-group fr-tags-group--sm toolbar__chips" data-testid="filtres-actifs">
      {#each chips as chip (chip.key)}
        <li>
          <button
            type="button"
            class="fr-tag fr-tag--dismiss"
            aria-label="Retirer le filtre {chip.label}"
            onclick={() => onRemoveFilter(chip.next)}
          >
            {chip.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="counter" data-testid="compteur-dossier">
    <span class="fr-text--lead">{numberFiltered}</span>
    <span class="fr-text--lg">{serviceLabel(services)}</span>
  </p>
</div>

<style lang="scss">
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
  }

  // Title on the left, search bar pushed to the right on the same row.
  .toolbar__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    h1 {
      margin: 0;
    }
  }

  .toolbar__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }

  // Pressed quick-filter buttons read as active.
  .fr-btn.active {
    box-shadow: inset 0 0 0 2px var(--border-active-blue-france, #000091);
  }

  .filter-counter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 0.25rem;
    border-radius: 0.75rem;
    background: var(--background-default-grey);
    color: var(--text-action-high-blue-france, #000091);
    font-size: 0.75rem;
    line-height: 1;
  }

  .toolbar__chips {
    margin: 0;
  }

  .counter {
    margin: 0;
  }
</style>
