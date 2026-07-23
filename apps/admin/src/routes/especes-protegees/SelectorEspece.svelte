<script lang="ts">
  import type { EspeceProtegee, ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    filterEspeces,
    compareEspeces,
    firstName,
    type EspecesQuery,
    type SortKey,
    type SortOrder,
    type Statut,
    type ListeFilter,
  } from "@pitchou/ui/especes/especesList.ts";
  import EspecesFilterPanel from "@pitchou/ui/especes/EspecesFilterPanel.svelte";
  import EspecesSortPanel from "@pitchou/ui/especes/EspecesSortPanel.svelte";

  type Props = {
    especes: EspeceProtegee[];
    /** CD_REFs already covered by a modification: flagged as "déjà dans la liste". */
    existingCdRefs: Set<string>;
    onSelect: (espece: EspeceProtegee) => void;
  };

  let { especes, existingCdRefs, onSelect }: Props = $props();

  const PAGE_SIZE = 10;

  let query = $state<EspecesQuery>({
    searchText: "",
    classification: "",
    statut: "",
    liste: "",
    sort: "nomScientifique",
    order: "asc",
    page: 1,
  });
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let hoveredCdRef = $state<string | null>(null);

  const activeFilterCount = $derived(
    (query.classification ? 1 : 0) + (query.statut ? 1 : 0) + (query.liste ? 1 : 0),
  );

  const filtered = $derived(filterEspeces(especes, query));
  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const currentPage = $derived(Math.min(query.page, pageCount));

  const displayed = $derived.by(() => {
    const sorted = [...filtered].sort((a, b) => compareEspeces(a, b, query.sort, query.order));
    return sorted.slice(PAGE_SIZE * (currentPage - 1), PAGE_SIZE * currentPage);
  });

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (pageCount <= 1) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => (query.page = i + 1));
    return [undefined, ...selectors];
  });

  function onSearchInput(value: string) {
    query.searchText = value;
    query.page = 1;
  }

  function onFilterChange(updates: {
    classification?: ClassificationEtreVivant | "";
    statut?: Statut | "";
    liste?: ListeFilter;
  }) {
    query = { ...query, ...updates, page: 1 };
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    query.sort = sort;
    query.order = order;
  }
</script>

<div class="selecteur">
  <div class="action-bar">
    <form onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-espece-existante">Rechercher une espèce</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          class="fr-input"
          placeholder="Nom scientifique ou vernaculaire"
          id="recherche-espece-existante"
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
      aria-controls="sort-panel-especes"
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

  <p class="count" aria-live="polite">
    <span class="fr-text--lead">{filtered.length}</span><span class="fr-text--lg"
      >/{especes.length} espèces</span
    >
  </p>

  {#if displayed.length >= 1}
    <div class="fr-table fr-table--bordered fr-table--layout-fixed">
      <table>
        <colgroup>
          <col />
          <col />
          <col style="width: 7rem" />
          <col style="width: 6rem" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Nom scientifique</th>
            <th scope="col">Nom vernaculaire</th>
            <th scope="col">Statuts</th>
            <th scope="col">CD_REF</th>
          </tr>
        </thead>
        <tbody>
          {#each displayed as espece (espece.CD_REF)}
            {@const alreadyListed = existingCdRefs.has(espece.CD_REF)}
            <tr
              class="clickable"
              class:already-listed={alreadyListed}
              class:hovered={hoveredCdRef === espece.CD_REF}
              class:no-bottom-line={alreadyListed}
              role="button"
              tabindex="0"
              title={alreadyListed
                ? "Déjà dans la liste — cliquer pour la modifier"
                : "Choisir cette espèce"}
              onmouseenter={() => (hoveredCdRef = espece.CD_REF)}
              onmouseleave={() => (hoveredCdRef = null)}
              onclick={() => onSelect(espece)}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(espece);
                }
              }}
            >
              <td><i>{firstName(espece.nomsScientifiques)}</i></td>
              <td>{firstName(espece.nomsVernaculaires)}</td>
              <td>{[...espece.CD_TYPE_STATUTS].join(", ")}</td>
              <td>{espece.CD_REF}</td>
            </tr>
            {#if alreadyListed}
              <tr
                class="clickable flagged-row"
                class:hovered={hoveredCdRef === espece.CD_REF}
                aria-hidden="true"
                onmouseenter={() => (hoveredCdRef = espece.CD_REF)}
                onmouseleave={() => (hoveredCdRef = null)}
                onclick={() => onSelect(espece)}
              >
                <td colspan="4">
                  <span class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                    Déjà dans la liste
                  </span>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>

    {#if pageSelectors}
      <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
    {/if}
  {:else}
    <p>Aucune espèce ne correspond à cette recherche.</p>
  {/if}
</div>

<style lang="scss">
  .selecteur {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
  }

  .action-bar {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.75rem;

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

  .search-bar {
    width: 100%;
  }

  .count {
    margin: 0;
  }

  .fr-table {
    overflow-x: auto;
  }

  .fr-table table {
    width: 100%;
  }

  tr.clickable {
    cursor: pointer;
  }

  tr.clickable.hovered {
    background-color: var(--background-contrast-grey);
  }

  tr.clickable:focus-visible {
    outline: 2px solid var(--bf500);
    outline-offset: -2px;
  }

  tr.already-listed i {
    color: var(--text-mention-grey);
  }

  // Fuse the data row with its badge sub-row: drop the divider line between them.
  tr.no-bottom-line {
    background-image: none;
  }

  // The badge sits on its own full-width line, snug under the data row.
  tr.flagged-row td {
    padding-top: 0;
    padding-bottom: 0.75rem;
  }
</style>
