<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import { envoyerÉvènementRechercherUnDossier } from "$lib/shared/aarri.ts";

  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import DossiersToolbar from "./DossiersToolbar.svelte";
  import DossiersResultats from "./DossiersResultats.svelte";
  import {
    parseDossiersQuery,
    filterDossiers,
    compareDossiers,
    listAvailableActivites,
    listAvailableDepartements,
    listAvailableInstructeurs,
    buildSearchEvent,
    type DossiersQuery,
    type DossiersContext,
    type SortKey,
    type SortOrder,
  } from "./dossiersList.ts";

  type Props = {
    titre: string;
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    afficherFiltreActionInstructeur?: boolean;
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let {
    titre,
    email = "",
    dossiers,
    relationSuivis,
    afficherFiltreActionInstructeur = false,
    notificationParDossier,
  }: Props = $props();

  const DOSSIERS_PER_PAGE = 10;

  // The URL query string is the single source of truth for search, filters, sort and page.
  const query = $derived(parseDossiersQuery(page.url.searchParams));

  const ctx = $derived<DossiersContext>({ notificationParDossier, relationSuivis });

  let statusMessage = $state("");
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  const availableActivites = $derived(listAvailableActivites(dossiers));
  const availableDepartements = $derived(listAvailableDepartements(dossiers));
  const availableInstructeurs = $derived(listAvailableInstructeurs(relationSuivis));

  const filteredDossiers = $derived(filterDossiers(dossiers, query, ctx));

  const pageCount = $derived(Math.max(1, Math.ceil(filteredDossiers.length / DOSSIERS_PER_PAGE)));
  // Clamp in case the URL points past the last page (e.g. after narrowing the filters)
  const currentPage = $derived(Math.min(query.page, pageCount));
  const paginated = $derived(filteredDossiers.length > DOSSIERS_PER_PAGE);

  const displayedDossiers = $derived.by(() => {
    const sorted = [...filteredDossiers].sort((a, b) =>
      compareDossiers(a, b, query.sort, query.order, notificationParDossier),
    );
    if (!paginated) return sorted;
    return sorted.slice(DOSSIERS_PER_PAGE * (currentPage - 1), DOSSIERS_PER_PAGE * currentPage);
  });

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (!paginated) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });

  const pageText = $derived(
    query.text.trim()
      ? `Résultats de recherche pour «${query.text}» : Page ${currentPage} sur ${pageCount}`
      : `Page ${currentPage} sur ${pageCount}`,
  );

  // Write the given param updates to the URL. A `null`, empty string or empty array removes
  // the param; an array writes one entry per value (multi-valued filters).
  // Any change other than pagination drops the page, sending the user back to the first one.
  // Returns the resulting query so callers can act on the new state without awaiting navigation.
  function updateQuery(
    updates: Record<string, string | string[] | null>,
    { resetPage = true } = {},
  ): DossiersQuery {
    const params = new URLSearchParams(page.url.searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (Array.isArray(value)) {
        params.delete(key);
        for (const entry of value) if (entry) params.append(key, entry);
      } else if (value === null || value === "") {
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
    return parseDossiersQuery(params);
  }

  function applyAndSignal(
    updates: Record<string, string | string[] | null>,
    { analytics = true } = {},
  ) {
    const next = updateQuery(updates);
    const filtered = filterDossiers(dossiers, next, ctx);

    // Announce the filtered count to assistive technologies
    statusMessage = `${filtered.length} dossiers affichés sur ${dossiers.length}`;
    setTimeout(() => (statusMessage = ""), 400);

    if (analytics) {
      const event = buildSearchEvent(next, filtered.length, {
        instructeurCount: availableInstructeurs.length,
        email,
      });
      envoyerÉvènementRechercherUnDossier(event);
    }
  }

  function goToPage(n: number) {
    updateQuery({ page: n > 1 ? String(n) : null }, { resetPage: false });
    tick().then(() => pageTitleElement?.focus());
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    applyAndSignal(
      { sort: sort === "nouveaute" ? null : sort, order: order === "desc" ? null : "asc" },
      { analytics: false },
    );
  }
</script>

<div class="en-tête">
  <h1>{titre}</h1>

  <DossiersToolbar
    {query}
    {availableActivites}
    {availableDepartements}
    {availableInstructeurs}
    showInstructeurFilter={Boolean(relationSuivis)}
    showActionInstructeurFilter={afficherFiltreActionInstructeur}
    {statusMessage}
    onSearchInput={(text) => updateQuery({ q: text || null })}
    onSearchCommit={(text) => applyAndSignal({ q: text || null })}
    onFilterChange={(updates) => applyAndSignal(updates)}
    {onSortChange}
  />

  <div class="count-and-page">
    <p class="count" data-testid={"compteur-dossier"}>
      <span class="fr-text--lead">{filteredDossiers.length}</span><span class="fr-text--lg"
        >/{dossiers.length} dossiers</span
      >
    </p>
    <h2 bind:this={pageTitleElement} tabindex="-1" class="page-title">{pageText}</h2>
  </div>
</div>

<DossiersResultats dossiers={displayedDossiers} {email} {relationSuivis} {notificationParDossier} />

{#if pageSelectors}
  <Pagination selectionneursPage={pageSelectors} pageActuelle={pageSelectors[currentPage]}
  ></Pagination>
{/if}

<style>
  .en-tête {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
    gap: 1rem;
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
