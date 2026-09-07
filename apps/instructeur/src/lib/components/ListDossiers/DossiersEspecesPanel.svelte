<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  import type { DossiersQuery } from "./listModel.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import { compareEspeces, matchesText } from "@pitchou/ui/especes/especesList.ts";
  import { CLASSIFICATION_EMOJI } from "@pitchou/ui/especes/classificationEmoji.ts";
  import NomEspece from "@pitchou/ui/especes/NomEspece.svelte";
  import Loader from "@pitchou/ui/Loader.svelte";
  import DossiersEspecesFilters from "./DossiersEspecesFilters.svelte";
  import {
    countEspecesFilters,
    emptyEspecesFilters,
    matchesEspeceFilters,
  } from "./especesFilterOptions.ts";

  type Props = { draft: DossiersQuery };
  let { draft = $bindable() }: Props = $props();

  /** How many results the « Afficher plus » button reveals at a time */
  const PAGE_SIZE = 20;

  // Search and attribute filters are panel-local: they steer the browsing, not the applied
  // dossiers filter, so they never reach the URL.
  let searchText = $state("");
  let filters = $state(emptyEspecesFilters());
  let filterPanelOpen = $state(false);
  let shownCount = $state(PAGE_SIZE);

  const especeByCD_REF = $derived(store.espèceByCD_REF);
  const allEspeces = $derived(especeByCD_REF ? [...especeByCD_REF.values()] : []);

  const activeFilterCount = $derived(countEspecesFilters(filters));

  const selectedEspeces = $derived(
    draft.espece.map((cdRef) => especeByCD_REF?.get(cdRef)).filter((e) => e !== undefined),
  );

  const matching = $derived.by(() => {
    const text = searchText.trim();
    return allEspeces
      .filter(
        (espece) => matchesEspeceFilters(espece, filters) && (!text || matchesText(espece, text)),
      )
      .sort((a, b) => compareEspeces(a, b, "nomVernaculaire", "asc"));
  });

  const shown = $derived(matching.slice(0, shownCount));

  // Narrowing the browsing sends the reader back to the top of the result list.
  $effect(() => {
    void searchText;
    void filters.classifications;
    void filters.statuts;
    void filters.instances;
    shownCount = PAGE_SIZE;
  });

  function toggle(cdRef: EspeceProtegee["CD_REF"]) {
    draft.espece = draft.espece.includes(cdRef)
      ? draft.espece.filter((value) => value !== cdRef)
      : [...draft.espece, cdRef];
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex items-start gap-2">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
        <label class="fr-sr-only fr-label" for="recherche-espece-dossiers">
          Rechercher une espèce protégée
        </label>
        <input
          bind:value={searchText}
          class="fr-input"
          id="recherche-espece-dossiers"
          type="search"
          placeholder="Entrez le nom scientifique ou vernaculaire…"
        />
        <button title="Rechercher une espèce protégée" type="submit" class="fr-btn">
          Rechercher
        </button>
      </div>
    </form>
    <button
      type="button"
      class="fr-btn fr-btn--secondary shrink-0"
      aria-expanded={filterPanelOpen}
      aria-controls="filtre-especes-dossiers"
      onclick={() => (filterPanelOpen = !filterPanelOpen)}
    >
      Filtres
      {#if activeFilterCount > 0}<span
          class="inline-flex items-center justify-center min-w-5 h-5 fr-ml-1v fr-px-1v rounded-[0.625rem] bg-[var(--background-action-high-blue-france)] text-[color:var(--text-inverted-blue-france)] text-[0.75rem] leading-none"
          aria-label="{activeFilterCount} filtre(s) actif(s)">{activeFilterCount}</span
        >{/if}
      <span
        class="fr-ml-1v before:[--icon-size:1rem] {filterPanelOpen
          ? 'fr-icon-arrow-up-s-line'
          : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
  </div>

  {#if filterPanelOpen}
    <DossiersEspecesFilters id="filtre-especes-dossiers" bind:filters />
  {/if}

  {#if !especeByCD_REF}
    <p class="fr-mb-0"><Loader />Chargement des espèces protégées…</p>
  {:else}
    {#if selectedEspeces.length > 0}
      <!-- Pinned, so an espece stays reachable once the search that surfaced it moves on. Folded by
           default: the count in the title is what the reader needs at a glance, and the results
           below stay in view. -->
      {@const plural = selectedEspeces.length > 1 ? "s" : ""}
      <section class="fr-accordion">
        <h3 class="fr-accordion__title">
          <button
            class="fr-accordion__btn"
            aria-expanded="false"
            aria-controls="especes-selectionnees"
          >
            {selectedEspeces.length} espèce{plural} sélectionnée{plural}
          </button>
        </h3>
        <div class="fr-collapse" id="especes-selectionnees">
          <div class="flex flex-col fr-pb-2w gap-1">
            {#each selectedEspeces as espece (espece.CD_REF)}
              <div class="fr-checkbox-group fr-checkbox-group--sm">
                <input
                  type="checkbox"
                  id="espece-selectionnee-{espece.CD_REF}"
                  checked
                  onchange={() => toggle(espece.CD_REF)}
                />
                <label class="fr-label" for="espece-selectionnee-{espece.CD_REF}">
                  <span class="fr-mr-1v" aria-hidden="true"
                    >{CLASSIFICATION_EMOJI[espece.classification]}</span
                  >
                  <NomEspece espèce={espece} />
                </label>
              </div>
            {/each}
            <button
              type="button"
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm self-start"
              onclick={() => (draft.espece = [])}
            >
              Tout désélectionner
            </button>
          </div>
        </div>
      </section>
    {/if}

    <p class="fr-text--bold fr-mb-0" aria-live="polite">
      {matching.length} espèce{matching.length > 1 ? "s" : ""}
    </p>

    <div class="flex flex-col gap-1">
      {#each shown as espece (espece.CD_REF)}
        <div class="fr-checkbox-group fr-checkbox-group--sm">
          <input
            type="checkbox"
            id="espece-{espece.CD_REF}"
            checked={draft.espece.includes(espece.CD_REF)}
            onchange={() => toggle(espece.CD_REF)}
          />
          <label class="fr-label" for="espece-{espece.CD_REF}">
            <span class="fr-mr-1v" aria-hidden="true"
              >{CLASSIFICATION_EMOJI[espece.classification]}</span
            >
            <NomEspece espèce={espece} />
          </label>
        </div>
      {:else}
        <p class="fr-mb-0">Aucune espèce protégée ne correspond à cette recherche.</p>
      {/each}
    </div>

    {#if shownCount < matching.length}
      <button
        type="button"
        class="fr-btn fr-btn--secondary self-start"
        onclick={() => (shownCount += PAGE_SIZE)}
      >
        Afficher plus de résultats
      </button>
    {/if}
  {/if}
</div>
