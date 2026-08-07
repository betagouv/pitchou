<script lang="ts">
  type Props = {
    searchText: string;
    activeFilterCount: number;
    filterPanelOpen: boolean;
    sortPanelOpen: boolean;
    generationModalId: string;
    onSearch: (value: string) => void;
    toggleFilter: () => void;
    toggleSort: () => void;
  };
  let {
    searchText,
    activeFilterCount,
    filterPanelOpen,
    sortPanelOpen,
    generationModalId,
    onSearch,
    toggleFilter,
    toggleSort,
  }: Props = $props();
</script>

<div class="flex flex-row justify-between items-center gap-4 flex-wrap">
  <h1 class="fr-mb-0">Espèces protégées</h1>
  <button
    type="button"
    class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-information-line fr-btn--icon-left"
    aria-controls={generationModalId}
    data-fr-opened="false">Comment cette liste est générée&nbsp;?</button
  >
</div>
<div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
  <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
    <div class="fr-search-bar w-full" role="search">
      <label class="fr-label" for="recherche-espece">Rechercher une espèce</label>
      <input
        value={searchText}
        oninput={(e) => onSearch(e.currentTarget.value)}
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
    onclick={toggleFilter}
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
    aria-controls="sort-panel-especes"
    onclick={toggleSort}
  >
    Trier <span
      class="fr-ml-1v before:[--icon-size:1rem] {sortPanelOpen
        ? 'fr-icon-arrow-up-s-line'
        : 'fr-icon-arrow-down-s-line'}"
      aria-hidden="true"
    ></span>
  </button>
</div>
