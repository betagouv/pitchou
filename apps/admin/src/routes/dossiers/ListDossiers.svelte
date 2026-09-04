<script lang="ts">
  import { onMount } from "svelte";

  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    loadDossiers,
    downloadDossiersWorkbook,
    defaultDossiersQuery,
    AccessDeniedError,
    type DossiersQuery,
    type AdminDossierSummary,
  } from "$lib/actions/adminDossiers.ts";
  import type { DossierSortKey, DossierSortOrder } from "$lib/actions/adminDossierTypes.ts";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import DossierCards from "./DossierCards.svelte";
  import CreateDossierModal from "./CreateDossierModal.svelte";
  import DossiersListControls from "./DossiersListControls.svelte";

  let query = $state<DossiersQuery>(defaultDossiersQuery());
  let dossiers = $state<AdminDossierSummary[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);
  let creatingDossier = $state(false);
  let downloading = $state(false);
  let downloadError = $state<string | null>(null);

  // The "create" entry point lives in the shell header ("+").
  $effect(() => {
    pageHeader.setAction({ label: "Créer un dossier", onClick: () => (creatingDossier = true) });
    return () => pageHeader.clearAction();
  });

  // Monotonic request id: only the latest in-flight response is allowed to win,
  // so a slow earlier request can never overwrite a newer one.
  let requestId = 0;

  const pageCount = $derived(Math.max(1, Math.ceil(total / query.pageSize)));
  const paginated = $derived(pageCount > 1);

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (!paginated) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => goToPage(i + 1));
    return [undefined, ...selectors];
  });
  const currentPageSelector = $derived(pageSelectors ? pageSelectors[query.page] : undefined);

  async function reload() {
    const id = ++requestId;
    loading = true;
    loadError = null;
    try {
      const page = await loadDossiers(query);
      if (id !== requestId) return; // A newer request superseded this one.
      dossiers = page.dossiers;
      total = page.total;
    } catch (e) {
      if (id !== requestId) return;
      if (e instanceof AccessDeniedError) {
        accessDenied = true;
      } else {
        loadError = e instanceof Error ? e.message : String(e);
      }
      dossiers = [];
      total = 0;
    } finally {
      if (id === requestId) loading = false;
    }
  }

  function goToPage(page: number) {
    query.page = page;
    reload();
  }

  // Debounce the free-text search so we fire one request when typing settles,
  // not one per keystroke.
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearchInput(value: string) {
    query.search = value;
    query.page = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(reload, 300);
  }

  function onFilterChange(updates: { phase?: string; source?: DossiersQuery["source"] }) {
    if (updates.phase !== undefined) query.phase = updates.phase;
    if (updates.source !== undefined) query.source = updates.source;
    query.page = 1;
    reload();
  }

  function onSortChange(sort: DossierSortKey, order: DossierSortOrder) {
    query.sort = sort;
    query.order = order;
    query.page = 1;
    reload();
  }

  async function downloadAllDossiers() {
    downloading = true;
    downloadError = null;
    try {
      await downloadDossiersWorkbook();
    } catch (e) {
      downloadError =
        e instanceof AccessDeniedError
          ? "Accès réservé aux administrateurs."
          : e instanceof Error
            ? e.message
            : String(e);
    } finally {
      downloading = false;
    }
  }

  onMount(reload);
</script>

{#if accessDenied}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <div class="flex flex-col gap-2">
    <div class="flex flex-row justify-end items-center gap-2 flex-wrap">
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-download-line fr-btn--icon-left"
        disabled={downloading}
        onclick={downloadAllDossiers}
      >
        Télécharger tous les dossiers
      </button>
    </div>

    {#if downloadError}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{downloadError}</p>
      </div>
    {/if}

    <DossiersListControls
      {query}
      {total}
      {loading}
      onSearch={onSearchInput}
      onFilter={onFilterChange}
      onSort={onSortChange}
    />
  </div>

  {#if loadError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-my-2w" role="alert">
      <p>{loadError}</p>
    </div>
  {/if}

  {#if dossiers.length >= 1}
    <DossierCards rows={dossiers} />

    {#if pageSelectors}
      <div class="mt-2">
        <Pagination {pageSelectors} currentPage={currentPageSelector} />
      </div>
    {/if}
  {:else if !loading}
    <p class="fr-mt-2w">Aucun dossier ne correspond à cette recherche.</p>
  {/if}
{/if}

{#if creatingDossier}
  <CreateDossierModal onClose={() => (creatingDossier = false)} />
{/if}
