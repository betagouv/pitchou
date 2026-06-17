<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { NiveauAARRI, UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
  import Pagination from "$front/components/DSFR/Pagination.svelte";

  import {
    parseUtilisateursQuery,
    filterUtilisateurs,
    compareUtilisateurs,
    type SortKey,
    type SortOrder,
  } from "./utilisateursList.ts";
  import UtilisateursFilterPanel from "./UtilisateursFilterPanel.svelte";
  import UtilisateursSortPanel from "./UtilisateursSortPanel.svelte";
  import UtilisateursTable from "./UtilisateursTable.svelte";
  import RepartitionNiveaux from "./RepartitionNiveaux.svelte";
  import NiveauxAARRIModale from "./NiveauxAARRIModale.svelte";

  type Props = {
    utilisateurs: UtilisateurAARRI[];
  };

  let { utilisateurs }: Props = $props();

  const UTILISATEURS_PER_PAGE = 20;

  const niveauxModaleId = "modale-niveaux-aarri";

  // The URL query string is the single source of truth for search, filter, sort and page.
  const query = $derived(parseUtilisateursQuery(page.url.searchParams));

  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  /** Number of active filters (shown on the « Filtrer » button) */
  const activeFilterCount = $derived(query.niveau ? 1 : 0);

  const filteredUtilisateurs = $derived(filterUtilisateurs(utilisateurs, query));

  const pageCount = $derived(
    Math.max(1, Math.ceil(filteredUtilisateurs.length / UTILISATEURS_PER_PAGE)),
  );
  // Clamp in case the URL points past the last page (e.g. after narrowing the filter)
  const currentPage = $derived(Math.min(query.page, pageCount));

  const paginated = $derived(filteredUtilisateurs.length > UTILISATEURS_PER_PAGE);

  const displayedUtilisateurs = $derived.by(() => {
    const sorted = [...filteredUtilisateurs].sort((a, b) =>
      compareUtilisateurs(a, b, query.sort, query.order),
    );
    if (!paginated) return sorted;
    return sorted.slice(
      UTILISATEURS_PER_PAGE * (currentPage - 1),
      UTILISATEURS_PER_PAGE * currentPage,
    );
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

  function onFilterChange(updates: { niveau?: NiveauAARRI | "" }) {
    updateQuery(updates);
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    updateQuery({
      tri: sort === "niveau" ? null : sort,
      ordre: order === "desc" ? null : "asc",
    });
  }
</script>

<div class="header">
  <div class="title-row">
    <h1>Utilisateurices et niveau AARRI</h1>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-information-line fr-btn--icon-left"
      aria-controls={niveauxModaleId}
      data-fr-opened="false"
    >
      Comment les niveaux sont calculés&nbsp;?
    </button>
  </div>

  <RepartitionNiveaux {utilisateurs} />

  <div class="action-bar">
    <form onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-utilisateur">Rechercher une utilisateurice</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="Email ou nom"
          id="recherche-utilisateur"
          type="search"
        />
        <button title="Rechercher une utilisateurice" type="submit" class="fr-btn"
          >Rechercher</button
        >
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

  {#if filterPanelOpen}
    <UtilisateursFilterPanel selectedNiveau={query.niveau} onChange={onFilterChange} />
  {/if}

  {#if sortPanelOpen}
    <UtilisateursSortPanel
      selectedSort={query.sort}
      sortOrder={query.order}
      onChange={onSortChange}
    />
  {/if}

  <div class="count-and-page">
    <p class="count" data-testid="compteur-utilisateurs" aria-live="polite">
      <span class="fr-text--lead">{filteredUtilisateurs.length}</span><span class="fr-text--lg"
        >/{utilisateurs.length} utilisateurices</span
      >
    </p>
    <h2 bind:this={pageTitleElement} tabindex="-1" class="page-title">{pageText}</h2>
  </div>
</div>

<UtilisateursTable utilisateurs={displayedUtilisateurs} />

{#if pageSelectors}
  <Pagination selectionneursPage={pageSelectors} pageActuelle={pageSelectors[currentPage]} />
{/if}

<NiveauxAARRIModale id={niveauxModaleId} />

<style lang="scss">
  .header {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
    gap: 1rem;

    h1 {
      margin-bottom: 0;
    }

    .title-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
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
