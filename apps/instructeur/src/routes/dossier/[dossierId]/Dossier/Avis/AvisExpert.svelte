<script lang="ts">
  import FormAvisExpert from "./FormAvisExpert.svelte";
  import AvisExpertFiles from "./AvisExpertFiles.svelte";
  import { readOnlyMode } from "../readOnly.ts";

  import type {
    DossierCnpnEmailSentEvent,
    DossierFull,
    FrontEndAvisExpert,
  } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossierId: DossierFull["id"];
    avisExpert: FrontEndAvisExpert;
    cnpnEmailEvent?: DossierCnpnEmailSentEvent;
    deleteAvisExpert: (avisExpert: FrontEndAvisExpert) => Promise<unknown>;
  };

  let { dossierId, avisExpert, cnpnEmailEvent, deleteAvisExpert }: Props = $props();

  const readOnly = readOnlyMode();

  let isEditing: boolean = $state(false);
  let showDeleteConfirmation = $state(false);
  let deleteInProgress = $state(false);

  const deleteConfirmationTitleId = $derived(`confirmation-suppression-avis-${avisExpert.id}`);

  function closeForm() {
    isEditing = false;
  }

  async function confirmDelete() {
    deleteInProgress = true;
    try {
      await deleteAvisExpert(avisExpert);
      showDeleteConfirmation = false;
      closeForm();
    } finally {
      deleteInProgress = false;
    }
  }
</script>

<div
  class="flex flex-col fr-p-3w border border-[color:var(--border-default-grey)] rounded-[4px] bg-[var(--background-default-grey)]"
>
  <div class="flex flex-row justify-between items-start gap-3 fr-mb-2w">
    <h3 class="fr-h5 fr-m-0">
      {avisExpert.expert ?? "Expert"}
      -
      {#if avisExpert.expert === "Ministre" || avisExpert.expert === "CNPN" || avisExpert.expert === "CSRPN"}
        {avisExpert.avis ?? "Avis en attente"}
      {:else}
        {avisExpert.avis_fichier_url ? "Avis rendu" : "Avis en attente"}
      {/if}
    </h3>
    {#if !isEditing && !readOnly.current}
      <button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
        type="button"
        onclick={() => (isEditing = true)}>Modifier</button
      >
    {/if}
  </div>
  <!-- Switching to read-only mode while the form is open closes it. -->
  {#if !isEditing || readOnly.current}
    <AvisExpertFiles {dossierId} {avisExpert} {cnpnEmailEvent} />
  {:else}
    <FormAvisExpert {dossierId} bind:avisExpertInitial={avisExpert} {closeForm} />
    <button
      class="fr-btn fr-btn--secondary fr-mt-1w"
      type="button"
      onclick={() => (showDeleteConfirmation = true)}>Supprimer cet avis d'expert</button
    >
  {/if}
</div>

{#if showDeleteConfirmation && !readOnly.current}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center fr-p-2w bg-[rgba(0,0,0,0.4)]">
    <div
      class="max-w-[32rem] fr-py-3w fr-px-4w rounded-[0.5rem] bg-[var(--background-default-grey)]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={deleteConfirmationTitleId}
    >
      <h5 id={deleteConfirmationTitleId} class="fr-mt-0">Supprimer cet avis d'expert ?</h5>
      <p>Cette action est irréversible.</p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="fr-btn fr-btn--secondary"
          disabled={deleteInProgress}
          onclick={() => (showDeleteConfirmation = false)}
        >
          Annuler
        </button>
        <button type="button" class="fr-btn" disabled={deleteInProgress} onclick={confirmDelete}>
          {deleteInProgress ? "Suppression en cours…" : "Confirmer la suppression"}
        </button>
      </div>
    </div>
  </div>
{/if}
