<script lang="ts">
  import type {
    DossiersQuery,
    DossierSortKey,
    DossierSortOrder,
  } from "$lib/actions/adminDossierTypes.ts";
  import DossiersFilterPanel from "./DossiersFilterPanel.svelte";
  import DossiersSortPanel from "./DossiersSortPanel.svelte";

  let {
    query,
    total,
    loading,
    onSearch,
    onFilter,
    onSort,
  }: {
    query: DossiersQuery;
    total: number;
    loading: boolean;
    onSearch: (value: string) => void;
    onFilter: (updates: { phase?: string; source?: DossiersQuery["source"] }) => void;
    onSort: (sort: DossierSortKey, order: DossierSortOrder) => void;
  } = $props();

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);

  const activeFilterCount = $derived((query.phase ? 1 : 0) + (query.source ? 1 : 0));
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-row items-start gap-2 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(event) => event.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-label" for="recherche-dossier">Rechercher un dossier</label>
        <input
          value={query.search}
          oninput={(event) => onSearch(event.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="Nom, demandeur ou numéro DN"
          id="recherche-dossier"
          type="search"
        />
        <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher</button>
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
      {#if activeFilterCount > 0}<span
          class="inline-flex items-center justify-center min-w-5 h-5 fr-ml-1v fr-py-0 fr-px-1v rounded-[0.625rem] bg-[var(--background-action-high-blue-france)] text-[color:var(--text-inverted-blue-france)] text-[0.75rem] leading-none"
          aria-label="{activeFilterCount} filtre(s) actif(s)">{activeFilterCount}</span
        >{/if}
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
      aria-controls="sort-panel"
      onclick={() => (sortPanelOpen = !sortPanelOpen)}
    >
      Trier<span
        class="fr-ml-1v before:[--icon-size:1rem] {sortPanelOpen
          ? 'fr-icon-arrow-up-s-line'
          : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
  </div>
  {#if filterPanelOpen}<DossiersFilterPanel
      selectedPhase={query.phase}
      selectedSource={query.source}
      onChange={onFilter}
    />{/if}
  {#if sortPanelOpen}<DossiersSortPanel
      selectedSort={query.sort}
      sortOrder={query.order}
      onChange={onSort}
    />{/if}
  <p class="fr-mb-0" aria-live="polite">
    <span class="fr-text--lead">{total}</span><span class="fr-text--lg"
      >&nbsp;dossier{total > 1 ? "s" : ""}</span
    >
    {#if loading}
      <span class="fr-text--sm fr-text-mention--grey fr-ml-1w">— chargement…</span>
    {/if}
  </p>
</div>
