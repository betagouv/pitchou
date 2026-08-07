<script lang="ts">
  import { tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";

  import type { NiveauAARRI, UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    parseUtilisateursQuery,
    filterUtilisateurs,
    compareUtilisateurs,
    utilisateursToCSV,
    listeGroupesInstructeurs,
    type SortKey,
    type SortOrder,
  } from "./utilisateursList.ts";
  import { downloadEvenementsCSV } from "$lib/actions/admin.ts";
  import UtilisateursListControls from "./UtilisateursListControls.svelte";
  import UtilisateursTable from "./UtilisateursTable.svelte";
  import RepartitionNiveaux from "./RepartitionNiveaux.svelte";
  import LevelsAARRIModal from "./LevelsAARRIModal.svelte";

  type Props = {
    utilisateurs: UtilisateurAARRI[];
  };

  let { utilisateurs }: Props = $props();

  const UTILISATEURS_PER_PAGE = 20;

  const levelsModalId = "modale-niveaux-aarri";

  // The URL query string is the single source of truth for search, filter, sort and page.
  const query = $derived(parseUtilisateursQuery(page.url.searchParams));

  let downloadError: string | null = $state(null);
  let pageTitleElement: HTMLHeadingElement | undefined = $state();

  const groupesInstructeurs = $derived(listeGroupesInstructeurs(utilisateurs));

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

  function onFilterChange(updates: { niveau?: NiveauAARRI | ""; groupe?: string }) {
    updateQuery(updates);
  }

  function onSortChange(sort: SortKey, order: SortOrder) {
    updateQuery({
      tri: sort === "niveau" ? null : sort,
      ordre: order === "desc" ? null : "asc",
    });
  }

  function downloadListeUtilisateurs() {
    const csv = utilisateursToCSV(utilisateurs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instructrices_aarri_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
</script>

<div class="flex flex-col fr-mt-2w gap-4">
  <div class="flex flex-row justify-between items-center gap-4 flex-wrap">
    <h1 class="fr-mb-0">Utilisateurices et niveau AARRI</h1>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-information-line fr-btn--icon-left"
      aria-controls={levelsModalId}
      data-fr-opened="false"
    >
      Comment les niveaux sont calculés&nbsp;?
    </button>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-download-line fr-btn--icon-left"
      onclick={downloadListeUtilisateurs}
    >
      Télécharger la liste des utilisateurices
    </button>
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-download-line fr-btn--icon-left"
      onclick={() => downloadEvenementsCSV().catch((e: Error) => (downloadError = e.message))}
    >
      Télécharger les évènements
    </button>
  </div>

  {#if downloadError}
    <div class="fr-alert fr-alert--error fr-mb-2w" role="alert">
      <p>{downloadError}</p>
    </div>
  {/if}

  <RepartitionNiveaux {utilisateurs} />

  <UtilisateursListControls
    {query}
    groupes={groupesInstructeurs}
    onSearch={onSearchInput}
    onFilter={onFilterChange}
    onSort={onSortChange}
  />

  <div class="flex flex-row justify-between items-baseline gap-4">
    <p class="fr-mb-0" data-testid="compteur-utilisateurs" aria-live="polite">
      <span class="fr-text--lead">{filteredUtilisateurs.length}</span><span class="fr-text--lg"
        >/{utilisateurs.length} utilisateurices</span
      >
    </p>
    <h2
      bind:this={pageTitleElement}
      tabindex="-1"
      class="text-[1rem] font-normal fr-mb-0 focus:[outline:2px_solid_var(--bf500)] focus:[outline-offset:2px]"
    >
      {pageText}
    </h2>
  </div>
</div>

<UtilisateursTable utilisateurs={displayedUtilisateurs} />

{#if pageSelectors}
  <Pagination {pageSelectors} currentPage={pageSelectors[currentPage]} />
{/if}

<LevelsAARRIModal id={levelsModalId} />
