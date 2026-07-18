<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./dossiersList.ts";
  import { clearFilters } from "./dossiersList.ts";
  import DossiersFilterSections from "./DossiersFilterSections.svelte";

  type Props = {
    open: boolean;
    draft: DossiersQuery;
    dossiers: DossierSummary[];
    relationSuivis?: PitchouState["relationSuivis"];
    showFilterInstructeurice: boolean;
    /** Live count of dossiers matching the current draft, shown on the footer button */
    numberResults: number;
    onApply: () => void;
    onClose: () => void;
  };

  let {
    open,
    draft = $bindable(),
    dossiers,
    relationSuivis,
    showFilterInstructeurice,
    numberResults,
    onApply,
    onClose,
  }: Props = $props();

  const resultsLabel = $derived(`Voir ${numberResults} résultat${numberResults > 1 ? "s" : ""}`);

  let dialogElement: HTMLDialogElement | undefined = $state();

  // Sync the native <dialog> with the controlled `open` prop.
  $effect(() => {
    if (!dialogElement) return;
    if (open && !dialogElement.open) dialogElement.showModal();
    if (!open && dialogElement.open) dialogElement.close();
  });

  function clearAll() {
    draft = clearFilters(draft);
  }
</script>

<!-- Clicking the backdrop (the dialog element itself, outside its content) closes the modal. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="filters-modal"
  aria-labelledby="filtres-modal-titre"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) onClose();
  }}
>
  <div class="filters-modal__content">
    <header class="filters-modal__header">
      <h2 id="filtres-modal-titre">Tous les filtres</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer les filtres"
        onclick={onClose}>Fermer</button
      >
    </header>

    <div class="filters-modal__sections">
      <DossiersFilterSections bind:draft {dossiers} {relationSuivis} {showFilterInstructeurice} />
    </div>

    <footer class="filters-modal__footer">
      <button type="button" class="fr-btn fr-btn--secondary" onclick={clearAll}>
        Tout effacer
      </button>
      <button type="button" class="fr-btn" onclick={onApply}>{resultsLabel}</button>
    </footer>
  </div>
</dialog>

<style lang="scss">
  // Right-anchored full-height drawer.
  .filters-modal {
    margin: 0 0 0 auto;
    height: 100vh;
    max-height: 100vh;
    width: min(28rem, 100vw);
    max-width: 100vw;
    border: 0;
    padding: 0;
    box-shadow: var(--overlap-shadow, 0 2px 12px rgba(0, 0, 0, 0.2));

    &::backdrop {
      background: rgba(22, 22, 22, 0.64);
    }
  }

  .filters-modal__content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background-default-grey);
  }

  .filters-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default-grey);

    h2 {
      margin: 0;
    }
  }

  .filters-modal__sections {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1rem 1.5rem;
  }

  .filters-modal__footer {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default-grey);
  }
</style>
