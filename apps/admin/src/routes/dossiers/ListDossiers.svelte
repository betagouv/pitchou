<script lang="ts">
  import { onMount } from "svelte";

  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import {
    loadDossiers,
    downloadDossiersCSV,
    defaultDossiersQuery,
    AccessDeniedError,
    type DossiersQuery,
    type AdminDossierSummary,
  } from "$lib/actions/adminDossiers.ts";
  import TableDossiers from "./TableDossiers.svelte";
  import DossiersListControls from "./DossiersListControls.svelte";
  import CreateDossierModal from "./CreateDossierModal.svelte";

  let query = $state<DossiersQuery>(defaultDossiersQuery());
  let dossiers = $state<AdminDossierSummary[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);
  let creatingDossier = $state(false);
  let downloading = $state(false);
  let downloadError = $state<string | null>(null);

  const currentYear = new Date().getFullYear();

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

  function onFilterChange() {
    query.page = 1;
    reload();
  }

  async function downloadCurrentYear() {
    downloading = true;
    downloadError = null;
    try {
      await downloadDossiersCSV(currentYear);
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
  <div class="flex flex-col fr-mt-2w gap-4">
    <div class="flex flex-row justify-between items-center gap-4 flex-wrap">
      <h1 class="fr-mb-0">Dossiers</h1>
      <div class="flex flex-row items-center gap-4 flex-wrap">
        <button
          class="fr-btn fr-btn--secondary fr-icon-download-line fr-btn--icon-left"
          type="button"
          disabled={downloading}
          onclick={downloadCurrentYear}
        >
          Télécharger les dossiers de l'année en cours
        </button>
        <button
          class="fr-btn fr-icon-add-line fr-btn--icon-left"
          type="button"
          onclick={() => (creatingDossier = true)}
        >
          Créer un dossier
        </button>
      </div>
    </div>

    {#if downloadError}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
        <p>{downloadError}</p>
      </div>
    {/if}

    <DossiersListControls bind:query onSearch={onSearchInput} onFilter={onFilterChange} />

    <p class="fr-mb-0" aria-live="polite">
      <span class="fr-text--lead">{total}</span><span class="fr-text--lg"
        >&nbsp;dossier{total > 1 ? "s" : ""}</span
      >
      {#if loading}
        <span class="fr-text--sm fr-text-mention--grey fr-ml-1w">— chargement…</span>
      {/if}
    </p>
  </div>

  {#if loadError}
    <div class="fr-alert fr-alert--error fr-alert--sm fr-my-2w" role="alert">
      <p>{loadError}</p>
    </div>
  {/if}

  {#if dossiers.length >= 1}
    <TableDossiers rows={dossiers} />

    {#if pageSelectors}
      <Pagination {pageSelectors} currentPage={currentPageSelector} />
    {/if}
  {:else if !loading}
    <p class="fr-mt-2w">Aucun dossier ne correspond à cette recherche.</p>
  {/if}
{/if}

{#if creatingDossier}
  <CreateDossierModal onClose={() => (creatingDossier = false)} />
{/if}
