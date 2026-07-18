<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { DossiersQuery, SortKey, SortOrder } from "./dossiersList.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    buildActiveFilterChips,
    buildDossiersSearchParams,
    buildSearchEvent,
    compareDossiers,
    copyDossiersQuery,
    countActiveFilters,
    filterDossiers,
    listAvailableInstructeurs,
    readDossiersQuery,
  } from "./dossiersList.ts";
  import {
    instructeurFollowsDossier,
    instructeurLeavesDossier,
  } from "$lib/dossier/suiviDossier.ts";
  import { sendEvenementRechercherUnDossier as _sendEvenementRechercherUnDossier } from "$lib/shared/aarri.ts";
  import CardDossier from "./CardDossier.svelte";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import DossiersToolbar from "./DossiersToolbar.svelte";
  import DossiersFilterModal from "./DossiersFilterModal.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { tick, untrack } from "svelte";

  type Props = {
    title: string;
    email?: string;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    /** Names of the instructeur's services (groupes instructeurs) */
    services?: string[];
    recentSearches?: string[];
    /** Show the instructeur·ice filter (quick button + modal section) — irrelevant on « mes dossiers » */
    showFilterInstructeurice?: boolean;
    showFilterEnjeu?: boolean;
    /** Show the « prochaine action à moi » quick filter — for « mes dossiers » */
    showFilterActionInstructeur?: boolean;
    notificationByDossier: PitchouState["notificationByDossier"];
  };

  let {
    title,
    email = "",
    dossiers,
    relationSuivis,
    services = [],
    recentSearches = [],
    showFilterInstructeurice = false,
    showFilterEnjeu = true,
    showFilterActionInstructeur = false,
    notificationByDossier,
  }: Props = $props();

  const NUMBER_DOSSIERS_PER_PAGE = 10;

  // The applied query lives entirely in the URL: search, filters, sort and page are all
  // reflected as query params, so the view is shareable and survives a reload.
  const query = $derived(readDossiersQuery(page.url.searchParams));

  // The draft edited inside the filters modal. It is mirrored to the URL live (see the
  // effect below), so the background list re-filters as each filter is toggled.
  let draft = $state<DossiersQuery>(readDossiersQuery(new URLSearchParams()));
  let modalOpen = $state(false);
  // Applied filters (page excluded) captured when the modal opens, to tell an untouched
  // draft (keep the current page) apart from an edited one (reset to the first page).
  let filterParamsAtOpening = "";

  let statusMessage = $state("");
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  const ctx = $derived({ notificationByDossier, relationSuivis });
  const filteredDossiers = $derived(filterDossiers(dossiers, query, ctx));
  const sortedDossiers = $derived(
    [...filteredDossiers].sort((a, b) =>
      compareDossiers(a, b, query.sort, query.order, notificationByDossier),
    ),
  );

  const numberPages = $derived(
    Math.max(1, Math.ceil(sortedDossiers.length / NUMBER_DOSSIERS_PER_PAGE)),
  );
  const currentPage = $derived(Math.min(Math.max(1, query.page), numberPages));
  const displayedDossiers = $derived(
    sortedDossiers.slice(
      NUMBER_DOSSIERS_PER_PAGE * (currentPage - 1),
      NUMBER_DOSSIERS_PER_PAGE * currentPage,
    ),
  );

  type PageSelector = () => void;
  const pageSelectors: undefined | [undefined, ...rest: PageSelector[]] = $derived.by(() => {
    if (sortedDossiers.length <= NUMBER_DOSSIERS_PER_PAGE) return undefined;
    const selectors = Array.from({ length: numberPages }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });

  const pageText = $derived(
    query.text.trim()
      ? `Résultats de recherche pour «${query.text}» : Page ${currentPage} sur ${numberPages}`
      : `Page ${currentPage} sur ${numberPages}`,
  );

  const activeFilterCount = $derived(countActiveFilters(query));
  const filterChips = $derived(buildActiveFilterChips(query));
  const instructeurCount = $derived(listAvailableInstructeurs(relationSuivis).length);

  const dossierIdsFollowedByCurrentInstructeur = $derived(
    relationSuivis?.get(email) ?? new Set<Dossier["id"]>(),
  );

  /** Reflects the given query into the URL, which is the single source of truth */
  function navigate(next: DossiersQuery) {
    const search = buildDossiersSearchParams(next).toString();
    goto(search ? `?${search}` : page.url.pathname, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  /** Applies a filter/search change: updates the URL, sends analytics and announces the count */
  function applySearch(next: DossiersQuery) {
    navigate(next);
    const count = filterDossiers(dossiers, next, ctx).length;
    _sendEvenementRechercherUnDossier(buildSearchEvent(next, count, { instructeurCount, email }));
    statusMessage = `${count} dossiers affichés sur ${dossiers.length}`;
    setTimeout(() => (statusMessage = ""), 400);
  }

  function onSearch(text: string) {
    applySearch({ ...copyDossiersQuery(query), text, page: 1 });
  }

  function onToggleSansInstructeurice() {
    const instructeur = query.instructeur.includes(WITHOUT_INSTRUCTEUR)
      ? query.instructeur.filter((value) => value !== WITHOUT_INSTRUCTEUR)
      : [...query.instructeur, WITHOUT_INSTRUCTEUR];
    applySearch({ ...copyDossiersQuery(query), instructeur, page: 1 });
  }

  /** Toggles one of the boolean quick filters and reapplies the search */
  function toggleFilter(key: "enjeu" | "actionInstructeur") {
    applySearch({ ...copyDossiersQuery(query), [key]: !query[key], page: 1 });
  }

  function onSort(key: SortKey, order: SortOrder) {
    navigate({ ...copyDossiersQuery(query), sort: key, order });
  }

  function goToPage(number: number) {
    navigate({ ...copyDossiersQuery(query), page: number });
    tick().then(() => pageTitleElement?.focus());
  }

  function openFilters() {
    draft = copyDossiersQuery(query);
    filterParamsAtOpening = buildDossiersSearchParams({ ...query, page: 1 }).toString();
    modalOpen = true;
  }

  // While the modal is open, reflect its draft into the URL on every change so the list
  // updates live. The page is reset to the first one only once the filters actually differ
  // from those applied when the modal opened (so merely opening it does not jump the page).
  $effect(() => {
    if (!modalOpen) return;
    const filtersUnchanged =
      buildDossiersSearchParams({ ...draft, page: 1 }).toString() === filterParamsAtOpening;
    const target = filtersUnchanged ? { ...draft } : { ...draft, page: 1 };
    // `navigate` reads `page.url`; untrack it so the effect depends only on the draft and the
    // open state, and writing the URL does not re-trigger the effect.
    untrack(() => navigate(target));
  });

  function applyFilters() {
    modalOpen = false;
    // The URL already reflects the draft (applied live); this records the search analytics
    // and announces the final count once.
    applySearch({ ...copyDossiersQuery(draft), page: 1 });
  }

  function currentInstructeurFollowsDossier(id: Dossier["id"]) {
    return instructeurFollowsDossier(email, id);
  }
  function currentInstructeurLeavesDossier(id: Dossier["id"]) {
    return instructeurLeavesDossier(email, id);
  }
</script>

<div class="header">
  <DossiersToolbar
    {title}
    searchText={query.text}
    {recentSearches}
    {showFilterInstructeurice}
    {showFilterEnjeu}
    {showFilterActionInstructeur}
    sansInstructeuriceActive={query.instructeur.includes(WITHOUT_INSTRUCTEUR)}
    enjeuActive={query.enjeu}
    actionInstructeurActive={query.actionInstructeur}
    {activeFilterCount}
    numberFiltered={filteredDossiers.length}
    {services}
    chips={filterChips}
    sortKey={query.sort}
    sortOrder={query.order}
    {onSearch}
    {onToggleSansInstructeurice}
    onToggleEnjeu={() => toggleFilter("enjeu")}
    onToggleActionInstructeur={() => toggleFilter("actionInstructeur")}
    onOpenFilters={openFilters}
    onRemoveFilter={applySearch}
    {onSort}
  />

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if statusMessage}{statusMessage}{/if}
  </div>

  <h2 bind:this={pageTitleElement} tabindex="-1" class="page-title">{pageText}</h2>
</div>

<DossiersFilterModal
  open={modalOpen}
  bind:draft
  {dossiers}
  {relationSuivis}
  {showFilterInstructeurice}
  numberResults={filteredDossiers.length}
  onApply={applyFilters}
  onClose={() => (modalOpen = false)}
/>

{#if displayedDossiers.length >= 1}
  <div class="dossiers-list fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul>
      {#each displayedDossiers as dossier (dossier.id)}
        <li>
          <CardDossier
            {dossier}
            {currentInstructeurFollowsDossier}
            {currentInstructeurLeavesDossier}
            dossierFollowedByCurrentInstructeur={dossierIdsFollowedByCurrentInstructeur.has(
              dossier.id,
            )}
            nouveautéVueParInstructeur={notificationByDossier.get(dossier.id)?.vue ?? true}
          />
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p>Aucun dossier n'a été trouvé.</p>
{/if}

{#if pageSelectors}
  <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
{/if}

<style>
  .dossiers-list {
    background: var(--background-contrast-grey);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li:not(:last-child) {
    margin-bottom: 1rem;
  }

  .header {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
  }

  .page-title {
    font-size: 1rem;
    font-weight: normal;
    margin-bottom: 0;
    margin-left: auto;
  }

  .page-title:focus {
    outline: 2px solid var(--bf500);
    outline-offset: 2px;
  }
</style>
