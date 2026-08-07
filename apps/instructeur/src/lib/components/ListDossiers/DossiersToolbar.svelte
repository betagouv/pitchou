<script lang="ts">
  import type { DossiersQuery, FilterChip, SortKey, SortOrder } from "./listModel.ts";
  import { serviceLabel } from "./listModel.ts";
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

<div class="flex flex-col gap-4 fr-mt-2w">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="fr-m-0">{title}</h1>

    <DossiersSearchBar {searchText} suggestions={recentSearches} {onSearch} />
  </div>

  <div class="flex flex-wrap items-center gap-4">
    {#if showFilterInstructeurice}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--secondary [&.active]:shadow-[inset_0_0_0_2px_var(--border-active-blue-france,#000091)]"
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
        class="fr-btn fr-btn--sm fr-btn--secondary [&.active]:shadow-[inset_0_0_0_2px_var(--border-active-blue-france,#000091)]"
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
        class="fr-btn fr-btn--sm fr-btn--secondary [&.active]:shadow-[inset_0_0_0_2px_var(--border-active-blue-france,#000091)]"
        aria-pressed={actionInstructeurActive}
        class:active={actionInstructeurActive}
        onclick={onToggleActionInstructeur}
      >
        Dossiers où je dois agir
      </button>
    {/if}

    <button
      type="button"
      class="fr-btn fr-btn--sm fr-icon-filter-line fr-btn--icon-left"
      onclick={onOpenFilters}
    >
      Filtres{#if activeFilterCount > 0}&nbsp;<span
          class="inline-flex items-center justify-center min-w-5 h-5 fr-py-0 fr-px-1v rounded-[0.75rem] bg-[var(--background-default-grey)] text-[color:var(--text-action-high-blue-france,#000091)] text-[0.75rem] leading-none"
          >{activeFilterCount}</span
        >{/if}
    </button>

    <DossiersSortMenu {sortKey} {sortOrder} {onSort} />
  </div>

  {#if chips.length > 0}
    <ul class="fr-tags-group fr-tags-group--sm fr-m-0" data-testid="filtres-actifs">
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

  <p class="fr-m-0" data-testid="compteur-dossier">
    <span class="fr-text--lead">{numberFiltered}</span>
    <span class="fr-text--lg">{serviceLabel(services)}</span>
  </p>
</div>
