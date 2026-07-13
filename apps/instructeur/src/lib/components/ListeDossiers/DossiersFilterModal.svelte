<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./dossiersList.ts";
  import { clearFilters } from "./dossiersList.ts";
  import DossiersFilterSections from "./DossiersFilterSections.svelte";

  type Props = {
    open: boolean;
    draft: DossiersQuery;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    afficherFiltreInstructeurice: boolean;
    /** Live count of dossiers matching the current draft, shown on the footer button */
    nombreResultats: number;
    onApply: () => void;
    onClose: () => void;
  };

  let {
    open,
    draft = $bindable(),
    dossiers,
    relationSuivis,
    afficherFiltreInstructeurice,
    nombreResultats,
    onApply,
    onClose,
  }: Props = $props();

  const libelléResultats = $derived(
    `Voir ${nombreResultats} résultat${nombreResultats > 1 ? "s" : ""}`,
  );

  let dialogElement: HTMLDialogElement | undefined = $state();

  // Sync the native <dialog> with the controlled `open` prop.
  $effect(() => {
    if (!dialogElement) return;
    if (open && !dialogElement.open) dialogElement.showModal();
    if (!open && dialogElement.open) dialogElement.close();
  });

  function toutEffacer() {
    draft = clearFilters(draft);
  }
</script>

<!-- Clicking the backdrop (the dialog element itself, outside its content) closes the modal. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="filtres-modal"
  aria-labelledby="filtres-modal-titre"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) onClose();
  }}
>
  <div class="filtres-modal__contenu">
    <header class="filtres-modal__entete">
      <h2 id="filtres-modal-titre">Tous les filtres</h2>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer les filtres"
        onclick={onClose}>Fermer</button
      >
    </header>

    <div class="filtres-modal__sections">
      <DossiersFilterSections
        bind:draft
        {dossiers}
        {relationSuivis}
        {afficherFiltreInstructeurice}
      />
    </div>

    <footer class="filtres-modal__pied">
      <button type="button" class="fr-btn fr-btn--secondary" onclick={toutEffacer}>
        Tout effacer
      </button>
      <button type="button" class="fr-btn" onclick={onApply}>{libelléResultats}</button>
    </footer>
  </div>
</dialog>

<style lang="scss">
  // Right-anchored full-height drawer.
  .filtres-modal {
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

  .filtres-modal__contenu {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--background-default-grey);
  }

  .filtres-modal__entete {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default-grey);

    h2 {
      margin: 0;
    }
  }

  .filtres-modal__sections {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 1rem 1.5rem;
  }

  .filtres-modal__pied {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default-grey);
  }
</style>
