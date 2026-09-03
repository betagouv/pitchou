<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type { DossiersQuery } from "./listModel.ts";
  import { clearFilters } from "./listModel.ts";
  import DossiersFilterSections from "./DossiersFilterSections.svelte";
  import DossiersEspecesPanel from "./DossiersEspecesPanel.svelte";

  type Props = {
    open: boolean;
    draft: DossiersQuery;
    dossiers: DossierSummary[];
    followRelations?: PitchouState["followRelations"];
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
    followRelations,
    showFilterInstructeurice,
    numberResults,
    onApply,
    onClose,
  }: Props = $props();

  const resultsLabel = $derived(`Voir ${numberResults} résultat${numberResults > 1 ? "s" : ""}`);

  let dialogElement: HTMLDialogElement | undefined = $state();

  let panel = $state<"filtres" | "especes">("filtres");
  $effect(() => {
    if (!open) panel = "filtres";
  });

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
<!-- Right-anchored full-height drawer. Width is roughly a third of the screen, kept wide
     enough that the date range stays on one line and the search placeholder is not
     truncated, and never wider than the viewport. -->
<dialog
  bind:this={dialogElement}
  class="my-0 mr-0 ml-auto h-screen max-h-screen w-[clamp(28rem,33vw,100vw)] max-w-[100vw] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  aria-labelledby="filtres-modal-titre"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) onClose();
  }}
>
  <div class="flex flex-col h-full bg-[var(--background-default-grey)]">
    <header
      class="flex items-center justify-between fr-py-2w fr-px-3w border-b border-[color:var(--border-default-grey)]"
    >
      <div class="flex items-center gap-1">
        {#if panel === "especes"}
          <button
            type="button"
            class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line"
            onclick={() => (panel = "filtres")}>Revenir à tous les filtres</button
          >
        {/if}
        <h2 id="filtres-modal-titre" class="fr-m-0">
          {panel === "especes" ? "Espèces impactées" : "Tous les filtres"}
        </h2>
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-icon-close-line"
        title="Fermer les filtres"
        onclick={onClose}>Fermer</button
      >
    </header>

    <div class="flex-[1_1_auto] overflow-y-auto fr-py-2w fr-px-3w">
      {#if panel === "especes"}
        <DossiersEspecesPanel bind:draft />
      {:else}
        <DossiersFilterSections
          bind:draft
          {dossiers}
          {followRelations}
          {showFilterInstructeurice}
          onOpenEspecesDrawer={() => (panel = "especes")}
        />
      {/if}
    </div>

    {#if panel === "filtres"}
      <footer
        class="flex justify-between gap-4 fr-py-2w fr-px-3w border-t border-[color:var(--border-default-grey)]"
      >
        <button type="button" class="fr-btn fr-btn--secondary" onclick={clearAll}>
          Tout effacer
        </button>
        <button type="button" class="fr-btn" onclick={onApply}>{resultsLabel}</button>
      </footer>
    {/if}
  </div>
</dialog>
