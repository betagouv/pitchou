<script lang="ts">
  import { serviceLabel } from "./listModel.ts";
  import DossiersSearchBar from "./DossiersSearchBar.svelte";
  import DossiersSortMenu from "./DossiersSortMenu.svelte";
  import DossiersExportButton from "./DossiersExportButton.svelte";

  import type { DossiersToolbarProps } from "./props.ts";
  import { readDossierSourceFilter } from "@pitchou/types/dossierSource.ts";

  let {
    title,
    showFilterSource = false,
    source = "",
    onSourceChange,
    loading = false,
    loadError = "",
    busy = false,
    searchDebounce = 0,
    exportQuery,
    exportCount,
    searchText,
    recentSearches,
    showFilterInstructeurice,
    showFilterEnjeu,
    showFilterActionInstructeur,
    showFilterUnread,
    withoutInstructeurActive,
    enjeuActive,
    actionInstructeurActive,
    unreadActive,
    activeFilterCount,
    numberFiltered,
    localisation = "assigned",
    followedOnly = false,
    exportDossierIds,
    chips,
    sortKey,
    sortOrder,
    onSearch,
    onToggleWithoutInstructeur,
    onToggleEnjeu,
    onToggleActionInstructeur,
    onToggleUnread,
    onOpenFilters,
    onRemoveFilter,
    onSort,
  }: DossiersToolbarProps = $props();
</script>

<div class="flex flex-col gap-4 fr-mt-2w">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="fr-m-0">{title}</h1>
    <DossiersExportButton
      {followedOnly}
      {localisation}
      dossierIds={exportDossierIds}
      query={exportQuery}
      totalDemandes={exportCount}
      disabled={loading || busy || !!loadError}
      {chips}
    />
  </div>

  <fieldset
    disabled={loading || !!loadError}
    aria-label="Recherche et filtres des dossiers"
    class="dossiers-toolbar-controls flex flex-wrap items-center gap-4 border-0 p-0 m-0 min-w-0"
  >
    <DossiersSearchBar
      debounceMs={searchDebounce}
      navigationKey={exportQuery}
      {searchText}
      suggestions={recentSearches}
      {onSearch}
    />
    {#if showFilterSource}
      <label class="flex items-center gap-2 fr-m-0">
        <span>Source</span>
        <select
          class="fr-select w-auto fr-m-0"
          value={source}
          onchange={(event) => onSourceChange?.(readDossierSourceFilter(event.currentTarget.value))}
        >
          <option value="">Toutes les sources</option>
          <option value="onagre">Onagre</option>
          <option value="demarche_numerique">Démarche Numérique (DN)</option>
        </select>
      </label>
    {/if}
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

    {#if showFilterUnread}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--secondary [&.active]:shadow-[inset_0_0_0_2px_var(--border-active-blue-france,#000091)]"
        aria-pressed={unreadActive}
        class:active={unreadActive}
        onclick={onToggleUnread}
      >
        Modifications non lues
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
  </fieldset>

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

  <p class="fr-m-0 min-h-8" data-testid="compteur-dossier">
    {#if loading}
      <span role="status">Chargement des dossiers…</span>
    {:else if loadError}
      <span>Liste des dossiers indisponible</span>
    {:else}
      <span class="fr-text--lead">{numberFiltered}</span>
      <span class="fr-text--lg">{serviceLabel(localisation, followedOnly)}</span>
      {#if busy}<span role="status" class="fr-ml-2w fr-text--sm">Actualisation des dossiers…</span
        >{/if}
    {/if}
  </p>
</div>

<style>
  .dossiers-toolbar-controls :global(.fr-btn) {
    height: 32px;
    min-height: 32px;
    border-radius: 4px;
  }

  .dossiers-toolbar-controls :global(.fr-search-bar .fr-btn) {
    border-radius: 0 4px 0 0;
  }

  .dossiers-toolbar-controls :global(.fr-search-bar .fr-input) {
    height: 32px;
    min-height: 32px;
  }
</style>
