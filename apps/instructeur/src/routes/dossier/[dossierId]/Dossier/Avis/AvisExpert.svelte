<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import FormAvisExpert from "./FormAvisExpert.svelte";
  import { readOnlyMode } from "../readOnly.ts";

  import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossierId: DossierFull["id"];
    avisExpert: FrontEndAvisExpert;
    deleteAvisExpert: (avisExpert: FrontEndAvisExpert) => Promise<unknown>;
  };

  let { dossierId, avisExpert, deleteAvisExpert }: Props = $props();

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
  <div class="flex flex-row justify-between items-start fr-mb-2w">
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
    <ul class="list-none ps-0 flex flex-col gap-3 fr-m-0">
      <!-- Saisines are never shared: only the avis itself is. -->
      {#if !readOnly.current}
        <li class="flex justify-between items-center gap-2 py-2">
          <span
            ><strong>Date de la saisine&nbsp;:</strong>
            {formatDateAbsolute(avisExpert.saisine_date)}
          </span>
          {#if avisExpert.saisine_fichier_url}
            <a
              class="fr-btn fr-btn--secondary fr-btn--sm"
              href={avisExpert.saisine_fichier_url}
              data-sveltekit-reload
            >
              Télécharger le fichier saisine
            </a>
          {:else}
            Aucun fichier de saisine n'est lié à ce dossier
          {/if}
        </li>
      {/if}
      {#if avisExpert.avis_fichier_url || avisExpert.avis_date || avisExpert.avis === "Avis favorable tacite"}
        <li class="flex justify-between items-center gap-2 py-2">
          <span
            ><strong>Date de l'avis&nbsp;:</strong> {formatDateAbsolute(avisExpert.avis_date)}
          </span>
          {#if avisExpert.avis_fichier_url}
            <a
              class="fr-btn fr-btn--secondary fr-btn--sm"
              href={avisExpert.avis_fichier_url}
              data-sveltekit-reload
            >
              Télécharger le fichier de l'avis
            </a>
          {:else if avisExpert.avis === "Avis favorable tacite"}
            Avis favorable tacite
          {:else}
            Aucun fichier de l'avis n'est lié à ce dossier
          {/if}
        </li>
      {/if}
    </ul>
  {:else}
    <FormAvisExpert {dossierId} bind:avisExpertInitial={avisExpert} {closeForm} />
    <button
      class="fr-btn fr-btn--secondary fr-mt-1w"
      type="button"
      onclick={() => (showDeleteConfirmation = true)}>Supprimer cet avis d'expert</button
    >
  {/if}
</div>

{#if showDeleteConfirmation}
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
