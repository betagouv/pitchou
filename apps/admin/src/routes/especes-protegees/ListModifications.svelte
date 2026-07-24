<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
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
  import ModalAdd from "./ModalAdd.svelte";
  import ModalEditModification from "./ModalEditModification.svelte";

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

  function onSelectExistante(espece: EspeceProtegee) {
    const existing = modifications.find((m) => m.cd_ref === espece.CD_REF) ?? null;
    modal = existing
      ? { seed: existing, creation: false }
      : { seed: seedFromEspece(espece), creation: false };
    ajoutOuvert = false;
  }
</script>

<div class="flex flex-col fr-mt-2w gap-4">
  <div class="flex flex-row justify-between items-center gap-4 flex-wrap">
    <h1 class="fr-mb-0">Administration - espèces protégées modifiées</h1>
    <button
      type="button"
      class="fr-btn fr-icon-add-line fr-btn--icon-left"
      onclick={() => (ajoutOuvert = true)}
    >
      Ajouter
    </button>
  </div>

  <div class="flex flex-row items-start gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
    <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
      <div class="fr-search-bar w-full" role="search">
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
      aria-controls="filter-panel"
      onclick={() => (filterPanelOpen = !filterPanelOpen)}
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
      aria-controls="sort-panel"
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

  <p class="fr-mb-0" aria-live="polite">
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
    <Pagination {pageSelectors} currentPage={pageSelectors[clampedPage]} />
  {/if}
{:else}
  <p>Aucune modification ne correspond à cette recherche.</p>
{/if}

{#if ajoutOuvert}
  <ModalAdd
    onClose={() => (ajoutOuvert = false)}
    {existingCdRefs}
    {onSelectExistante}
    {onSelectTaxref}
  />
{/if}

{#if modal}
  <ModalEditModification
    seed={modal.seed}
    creation={modal.creation}
    onSaved={onReload}
    onClose={() => (modal = null)}
  />
{/if}
