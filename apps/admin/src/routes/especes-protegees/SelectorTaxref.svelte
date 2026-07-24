<script lang="ts">
  import Loader from "@pitchou/ui/Loader.svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    fetchTaxrefPage,
    fetchTaxrefFiltres,
    TAXREF_PAGE_SIZE,
    type TaxrefRow,
    type TaxrefQuery,
    type TaxrefFiltres,
    type SortKey,
    type SortOrder,
  } from "@pitchou/ui/taxref/taxrefList.ts";
  import TaxrefFilterPanel from "@pitchou/ui/taxref/TaxrefFilterPanel.svelte";
  import TaxrefSortPanel from "@pitchou/ui/taxref/TaxrefSortPanel.svelte";

  type Props = {
    /** CD_REFs already protected: flagged "déjà dans la liste" and not selectable. */
    existingCdRefs: Set<string>;
    onSelect: (row: TaxrefRow) => void;
  };

  let { existingCdRefs, onSelect }: Props = $props();

  let query = $state<TaxrefQuery>({
    searchText: "",
    regne: "",
    classe: "",
    sort: "nomScientifique",
    order: "asc",
    page: 1,
  });

  let rows = $state<TaxrefRow[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let filtres = $state<TaxrefFiltres | null>(null);
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let hoveredCdNom = $state<string | null>(null);

  // Discards out-of-order responses: only the latest request may update the table.
  let requestId = 0;
  // Debounces the text search so typing fires one request, not one per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const current = $state.snapshot(query) as TaxrefQuery;
    const id = ++requestId;
    loading = true;
    error = null;
    fetchTaxrefPage(current)
      .then((res) => {
        if (id !== requestId) return;
        rows = res.rows;
        total = res.total;
        loading = false;
      })
      .catch((e) => {
        if (id !== requestId) return;
        error = e instanceof Error ? e.message : String(e);
        loading = false;
      });
  });

  const pageCount = $derived(Math.max(1, Math.ceil(total / TAXREF_PAGE_SIZE)));
  const currentPage = $derived(Math.min(query.page, pageCount));
  const activeFilterCount = $derived((query.regne ? 1 : 0) + (query.classe ? 1 : 0));

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (pageCount <= 1) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => (query.page = i + 1));
    return [undefined, ...selectors];
  });

  function onSearchInput(value: string) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      query.searchText = value;
      query.page = 1;
    }, 250);
  }

  async function toggleFilterPanel() {
    filterPanelOpen = !filterPanelOpen;
    if (filterPanelOpen && !filtres) filtres = await fetchTaxrefFiltres();
  }

  function onFilterChange(updates: { regne?: string; classe?: string }) {
    query = { ...query, ...updates, page: 1 };
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    query.sort = sort;
    query.order = order;
    query.page = 1;
  }
</script>

<div class="flex flex-col gap-4 fr-p-3w">
  <div class="flex flex-row items-start gap-3 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-label" for="recherche-taxref-ajout">Rechercher un taxon</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          class="fr-input"
          placeholder="Nom scientifique, vernaculaire, CD_NOM ou CD_REF"
          id="recherche-taxref-ajout"
          type="search"
        />
        <button title="Rechercher un taxon" type="submit" class="fr-btn">Rechercher</button>
      </div>
    </form>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
      aria-expanded={filterPanelOpen}
      aria-controls="filter-panel-taxref"
      onclick={toggleFilterPanel}
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
      aria-controls="sort-panel-taxref"
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
    <TaxrefFilterPanel
      {filtres}
      selectedRegne={query.regne}
      selectedClasse={query.classe}
      onChange={onFilterChange}
    />
  {/if}

  {#if sortPanelOpen}
    <TaxrefSortPanel selectedSort={query.sort} sortOrder={query.order} onChange={onSortChange} />
  {/if}

  <p class="fr-m-0" aria-live="polite">
    <span class="fr-text--lead">{total.toLocaleString("fr-FR")}</span><span class="fr-text--lg"
      >&nbsp;{total > 1 ? "taxons" : "taxon"}</span
    >
  </p>

  {#if error}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
      <p>{error}</p>
    </div>
  {:else if loading && rows.length === 0}
    <Loader />
  {:else if rows.length >= 1}
    <div
      class="fr-table fr-table--bordered fr-table--layout-fixed overflow-x-auto [&.loading]:opacity-50 [&.loading]:[transition:opacity_0.15s_ease]"
      class:loading
    >
      <table class="w-full">
        <colgroup>
          <col style="width: 100px" />
          <col style="width: 100px" />
          <col />
          <col />
          <col style="width: 110px" />
          <col style="width: 110px" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">CD_NOM</th>
            <th scope="col">CD_REF</th>
            <th scope="col">Nom scientifique</th>
            <th scope="col">Nom vernaculaire</th>
            <th scope="col">Règne</th>
            <th scope="col">Classe</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            {@const alreadyListed = existingCdRefs.has(row.cd_ref)}
            <tr
              class="[&.clickable]:cursor-pointer [&.clickable.hovered]:bg-[var(--background-contrast-grey)] [&.clickable]:focus-visible:[outline:2px_solid_var(--bf500)] [&.clickable]:focus-visible:[outline-offset:-2px] [&.no-bottom-line]:bg-none"
              class:clickable={!alreadyListed}
              class:hovered={hoveredCdNom === row.cd_nom}
              class:no-bottom-line={alreadyListed}
              role={alreadyListed ? undefined : "button"}
              tabindex={alreadyListed ? undefined : 0}
              title={alreadyListed ? "Déjà une espèce protégée" : "Ajouter ce taxon"}
              onmouseenter={() => (hoveredCdNom = row.cd_nom)}
              onmouseleave={() => (hoveredCdNom = null)}
              onclick={() => !alreadyListed && onSelect(row)}
              onkeydown={(e) => {
                if (!alreadyListed && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(row);
                }
              }}
            >
              <td>{row.cd_nom}</td>
              <td>{row.cd_ref}</td>
              <td><i>{row.lb_nom}</i></td>
              <td>{row.nom_vern}</td>
              <td>{row.regne}</td>
              <td>{row.classe}</td>
            </tr>
            {#if alreadyListed}
              <tr class="[&_td]:pt-0 [&_td]:pb-3" aria-hidden="true">
                <td colspan="6">
                  <span class="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                    Déjà une espèce protégée
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
    <p>Aucun taxon ne correspond à cette recherche.</p>
  {/if}
</div>
