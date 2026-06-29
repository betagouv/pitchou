<script lang="ts">
  import type { EspèceProtégée } from "@pitchou/types/especes.d.ts";
  import type { ModificationEspeceAdmin } from "$lib/actions/adminEspeces.ts";
  import { saveModificationEspece } from "$lib/actions/adminEspeces.ts";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";

  import { classificationFromTaxref, type TaxrefRow } from "@pitchou/ui/taxref/taxrefList.ts";
  import {
    defaultQuery,
    filterModifications,
    compareModifications,
    emptySeed,
    seedFromEspece,
    type ModificationsQuery,
    type EtatFilter,
    type ListeFilter,
    type ModificationSortKey,
    type SortOrder,
  } from "./adminModificationsList.ts";
  import ModificationsFilterPanel from "./ModificationsFilterPanel.svelte";
  import ModificationsSortPanel from "./ModificationsSortPanel.svelte";
  import TableModifications from "./TableModifications.svelte";
  import ModaleAjout from "./ModaleAjout.svelte";
  import ModaleEditionModification from "./ModaleEditionModification.svelte";

  type Props = {
    modifications: ModificationEspeceAdmin[];
    onReload: () => Promise<void> | void;
  };

  let { modifications, onReload }: Props = $props();

  type ModalState = { seed: ModificationEspeceAdmin; creation: boolean };

  const ITEMS_PER_PAGE = 20;

  let query = $state<ModificationsQuery>(defaultQuery());
  let filterPanelOpen = $state(false);
  let sortPanelOpen = $state(false);
  let currentPage = $state(1);

  let ajoutOuvert = $state(false);
  let modal = $state<ModalState | null>(null);
  let ajoutError = $state<string | null>(null);

  const activeFilterCount = $derived(
    (query.classification ? 1 : 0) +
      (query.statut ? 1 : 0) +
      (query.etat ? 1 : 0) +
      (query.liste ? 1 : 0),
  );

  const filtered = $derived(filterModifications(modifications, query));

  // CD_REFs already covered by a modification: the selector flags these rows so the
  // admin updates the existing one instead of trying to add a duplicate.
  const existingCdRefs = $derived(new Set(modifications.map((m) => m.cd_ref)));

  const pageCount = $derived(Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)));
  const clampedPage = $derived(Math.min(currentPage, pageCount));
  const paginated = $derived(filtered.length > ITEMS_PER_PAGE);

  const displayed = $derived.by(() => {
    const sorted = [...filtered].sort((a, b) =>
      compareModifications(a, b, query.sort, query.order),
    );
    if (!paginated) return sorted;
    return sorted.slice(ITEMS_PER_PAGE * (clampedPage - 1), ITEMS_PER_PAGE * clampedPage);
  });

  type PageSelector = () => void;
  const pageSelectors = $derived.by<undefined | [undefined, ...PageSelector[]]>(() => {
    if (!paginated) return undefined;
    const selectors = Array.from({ length: pageCount }, (_v, i) => () => (currentPage = i + 1));
    return [undefined, ...selectors];
  });

  function onSearchInput(value: string) {
    query.searchText = value;
    currentPage = 1;
  }

  function onFilterChange(updates: {
    classification?: string;
    statut?: string;
    etat?: EtatFilter;
    liste?: ListeFilter;
  }) {
    query = { ...query, ...updates };
    currentPage = 1;
  }

  function onSortChange(sort: ModificationSortKey, order: SortOrder) {
    query.sort = sort;
    query.order = order;
  }

  // Adding from TAXREF: deduce the classification (as the import does), persist the new
  // species with its TAXREF names, then open the per-field editor for any refinements.
  async function onSelectTaxref(row: TaxrefRow) {
    ajoutError = null;
    const classification = classificationFromTaxref(row.regne, row.classe);
    if (!classification) {
      ajoutError = `Classification indéterminée pour ${row.lb_nom} (règne « ${row.regne} »).`;
      return;
    }
    const noms_scientifiques = row.lb_nom ? [row.lb_nom] : [];
    const noms_vernaculaires = row.nom_vern
      .split(",")
      .map((nom) => nom.trim())
      .filter(Boolean);
    try {
      await saveModificationEspece(row.cd_ref, {
        classification,
        noms_scientifiques,
        noms_vernaculaires,
      });
    } catch (e) {
      ajoutError = e instanceof Error ? e.message : String(e);
      return;
    }
    await onReload();
    modal = {
      seed: { ...emptySeed(row.cd_ref), classification, noms_scientifiques, noms_vernaculaires },
      creation: false,
    };
    ajoutOuvert = false;
  }

  function onSelectExistante(espece: EspèceProtégée) {
    const existing = modifications.find((m) => m.cd_ref === espece.CD_REF) ?? null;
    modal = existing
      ? { seed: existing, creation: false }
      : { seed: seedFromEspece(espece), creation: false };
    ajoutOuvert = false;
  }
</script>

<div class="header">
  <div class="title-row">
    <h1>Administration - espèces protégées modifiées</h1>
    <button
      type="button"
      class="fr-btn fr-icon-add-line fr-btn--icon-left"
      onclick={() => (ajoutOuvert = true)}
    >
      Ajouter
    </button>
  </div>

  <div class="action-bar">
    <form onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar search-bar" role="search">
        <label class="fr-label" for="recherche-modification">Rechercher une modification</label>
        <input
          value={query.searchText}
          oninput={(e) => onSearchInput(e.currentTarget.value)}
          name="texte-de-recherche"
          class="fr-input"
          placeholder="CD_REF, nom scientifique ou vernaculaire"
          id="recherche-modification"
          type="search"
        />
        <button title="Rechercher une modification" type="submit" class="fr-btn">Rechercher</button>
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
    <ModificationsFilterPanel
      selectedClassification={query.classification}
      selectedStatut={query.statut}
      selectedEtat={query.etat}
      selectedListe={query.liste}
      onChange={onFilterChange}
    />
  {/if}

  {#if sortPanelOpen}
    <ModificationsSortPanel
      selectedSort={query.sort}
      sortOrder={query.order}
      onChange={onSortChange}
    />
  {/if}

  <p class="count" aria-live="polite">
    <span class="fr-text--lead">{filtered.length}</span><span class="fr-text--lg"
      >/{modifications.length} modification{modifications.length > 1 ? "s" : ""}</span
    >
  </p>
</div>

{#if ajoutError}
  <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
    <p>{ajoutError}</p>
  </div>
{/if}

{#if displayed.length >= 1}
  <TableModifications
    rows={displayed}
    onSelect={(modification) => (modal = { seed: modification, creation: false })}
  />

  {#if pageSelectors}
    <Pagination selectionneursPage={pageSelectors} pageActuelle={pageSelectors[clampedPage]} />
  {/if}
{:else}
  <p>Aucune modification ne correspond à cette recherche.</p>
{/if}

{#if ajoutOuvert}
  <ModaleAjout
    onClose={() => (ajoutOuvert = false)}
    {existingCdRefs}
    {onSelectExistante}
    {onSelectTaxref}
  />
{/if}

{#if modal}
  <ModaleEditionModification
    seed={modal.seed}
    creation={modal.creation}
    onSaved={onReload}
    onClose={() => (modal = null)}
  />
{/if}

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

    .count {
      margin-bottom: 0;
    }
  }

  .search-bar {
    width: 100%;
  }
</style>
