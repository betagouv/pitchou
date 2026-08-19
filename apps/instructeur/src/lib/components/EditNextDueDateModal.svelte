<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { store } from "$lib/state/store.svelte.ts";
  import { updateDossierNextDueDate } from "$lib/dossier/dossier.ts";
  import DateInput from "$lib/components/DateInput.svelte";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  type Props = {
    dossierId: Dossier["id"];
    dossierName: Dossier["name"];
    onClose: () => void;
  };

  let { dossierId, dossierName, onClose }: Props = $props();

  const titleId = $derived(`next-due-date-title-${dossierId}`);
  let dialogElement: HTMLDialogElement | undefined = $state();
  let saving = $state(false);
  let errorMessage = $state("");
  // Editing from the list: the summary in the store is the only copy we have here. The
  // modal is mounted afresh for each dossier, so seeding the field once is what we want.
  let dueDate: Date | null | undefined = $state(
    untrack(() => store.dossierSummaries.get(dossierId)?.next_due_date),
  );

  onMount(() => dialogElement?.showModal());

  async function submit() {
    saving = true;
    errorMessage = "";
    try {
      await updateDossierNextDueDate(dossierId, dueDate ?? null);
      dialogElement?.close();
    } catch (error) {
      console.error("Failed to update the dossier next due date", error);
      errorMessage = "La modification de la date d’échéance a échoué. Veuillez réessayer.";
    } finally {
      saving = false;
    }
  }

  function close() {
    if (!saving) dialogElement?.close();
  }
</script>

<!-- overflow-visible: the dialog's default `overflow: auto` would clip the date picker's
     calendar panel, which pops beyond the dialog's bounds. -->
<dialog
  bind:this={dialogElement}
  class="w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-visible border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  style="margin: auto;"
  aria-labelledby={titleId}
  onclose={onClose}
  oncancel={(event) => {
    if (saving) event.preventDefault();
  }}
>
  <div class="flex flex-col bg-[var(--background-default-grey)]">
    <header
      class="flex items-start justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <div>
        <h2 id={titleId} class="fr-m-0">Modifier la date de la prochaine échéance</h2>
        <p class="fr-mt-1w fr-mb-0 text-[color:var(--text-mention-grey)]">
          {dossierName || `Dossier n°${dossierId}`}
        </p>
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line"
        onclick={close}
      >
        Fermer
      </button>
    </header>

    <div class="fr-p-3w">
      <div class="fr-input-group fr-mb-0">
        <label class="fr-label" for="next-due-date-{dossierId}">
          <strong>Date de la prochaine échéance</strong>
          <span class="fr-hint-text">Laissez le champ vide pour retirer l’échéance.</span>
        </label>
        <DateInput
          id="next-due-date-{dossierId}"
          label="Date de la prochaine échéance"
          bind:date={dueDate}
        />
      </div>
      {#if errorMessage}
        <p class="fr-error-text">{errorMessage}</p>
      {/if}
    </div>

    <footer
      class="flex justify-end gap-2 border-t border-[color:var(--border-default-grey)] fr-p-3w"
    >
      <button type="button" class="fr-btn fr-btn--secondary" onclick={close} disabled={saving}>
        Annuler
      </button>
      <button type="button" class="fr-btn" onclick={submit} disabled={saving}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </footer>
  </div>
</dialog>
