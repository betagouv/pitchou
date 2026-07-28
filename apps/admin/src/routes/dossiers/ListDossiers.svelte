<script lang="ts">
  import { onMount } from "svelte";

  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import {
    loadDossiers,
    defaultDossiersQuery,
    AccessDeniedError,
    type DossiersQuery,
    type AdminDossierSummary,
  } from "$lib/actions/adminDossiers.ts";
  import TableDossiers from "./TableDossiers.svelte";

  let query = $state<DossiersQuery>(defaultDossiersQuery());
  let dossiers = $state<AdminDossierSummary[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let accessDenied = $state(false);

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
      <a class="fr-btn fr-icon-add-line fr-btn--icon-left" href="/dossiers/nouveau">
        Créer un dossier
      </a>
    </div>

    <div class="flex flex-row items-end gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
      <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
        <div class="fr-search-bar w-full" role="search">
          <label class="fr-label" for="recherche-dossier">Rechercher un dossier</label>
          <input
            value={query.search}
            oninput={(e) => onSearchInput(e.currentTarget.value)}
            name="texte-de-recherche"
            class="fr-input"
            placeholder="Nom, demandeur ou numéro DN"
            id="recherche-dossier"
            type="search"
          />
          <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher</button>
        </div>
      </form>

      <div class="fr-select-group fr-mb-0">
        <label class="fr-label" for="filtre-phase">Phase</label>
        <select
          class="fr-select"
          id="filtre-phase"
          bind:value={query.phase}
          onchange={onFilterChange}
        >
          <option value="">Toutes</option>
          {#each [...phases] as phase (phase)}
            <option value={phase}>{phase}</option>
          {/each}
        </select>
      </div>

      <div class="fr-select-group fr-mb-0">
        <label class="fr-label" for="filtre-source">Source</label>
        <select
          class="fr-select"
          id="filtre-source"
          bind:value={query.source}
          onchange={onFilterChange}
        >
          <option value="">Toutes</option>
          <option value="pitchou">Créé dans Pitchou</option>
          <option value="dn">Importé de Démarches Numériques</option>
        </select>
      </div>
    </div>

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
