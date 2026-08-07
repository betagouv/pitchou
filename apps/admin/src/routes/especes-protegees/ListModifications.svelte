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
  import ModificationsListControls from "./ModificationsListControls.svelte";
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
  let currentPage = $state(1);

  let ajoutOuvert = $state(false);
  let modal = $state<ModalState | null>(null);
  let ajoutError = $state<string | null>(null);

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

<div class="flex flex-row justify-between items-center gap-4 flex-wrap fr-mt-2w">
  <h1 class="fr-mb-0">Administration - espèces protégées modifiées</h1>
  <button
    type="button"
    class="fr-btn fr-icon-add-line fr-btn--icon-left"
    onclick={() => (ajoutOuvert = true)}>Ajouter</button
  >
</div>
<ModificationsListControls
  {query}
  {modifications}
  filteredCount={filtered.length}
  onSearch={onSearchInput}
  onFilter={onFilterChange}
  onSort={onSortChange}
/>

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
