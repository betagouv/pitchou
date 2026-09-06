<script lang="ts">
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import FormAvisExpert from "./FormAvisExpert.svelte";

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

  let isEditing: boolean = $state(false);
  let showDeleteConfirmation = $state(false);
  let deleteInProgress = $state(false);

  const deleteConfirmationTitleId = $derived(`confirmation-suppression-avis-${avisExpert.id}`);
  const isCnpn = $derived(avisExpert.expert?.trim().toUpperCase() === "CNPN");

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
    {#if !isEditing}
      <button
        class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-pencil-line"
        type="button"
        onclick={() => (isEditing = true)}>Modifier</button
      >
    {/if}
  </div>
  {#if !isEditing}
    <ul
      class="list-none fr-m-0 fr-p-0 border-t border-solid border-[color:var(--border-default-grey)]"
    >
      <li
        class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
      >
        <span
          class="fr-icon-file-text-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
          aria-hidden="true"
        ></span>
        <div class="min-w-0 flex-1">
          <span class="fr-hint-text block">Date d’ajout du courrier de saisine</span>
          <strong class="block">
            {formatDateAbsolute(
              avisExpert.saisine_fichier_description?.created_at ?? avisExpert.saisine_date,
            )}
          </strong>
          {#if !avisExpert.saisine_fichier_url}
            <span class="fr-hint-text">Aucun fichier lié à ce dossier</span>
          {/if}
        </div>
        {#if avisExpert.saisine_fichier_url}
          <a
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-download-line flex-none"
            href={avisExpert.saisine_fichier_url}
            data-sveltekit-reload
            aria-label="Télécharger le fichier saisine"
          >
            Télécharger
          </a>
        {/if}
      </li>

      {#if isCnpn}
        <li
          class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
        >
          <span
            class="fr-icon-send-plane-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
            aria-hidden="true"
          ></span>
          <div class="min-w-0 flex-1">
            <span class="fr-hint-text block">Date d’envoi du mail via Pitchou</span>
            <strong class="block">
              {cnpnEmailEvent ? formatDateAbsolute(cnpnEmailEvent.sent_at) : "Pas encore envoyé"}
            </strong>
          </div>
        </li>
        <li
          class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
        >
          <span
            class="fr-icon-eye-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
            aria-hidden="true"
          ></span>
          <div class="min-w-0 flex-1">
            <span class="fr-hint-text block">Date de lecture de la saisine</span>
            <strong class="block">
              {cnpnEmailEvent?.opened_at
                ? formatDateAbsolute(cnpnEmailEvent.opened_at)
                : "Pas encore lue"}
            </strong>
          </div>
        </li>
      {/if}

      {#if avisExpert.avis_fichier_url || avisExpert.avis_date || avisExpert.avis === "Avis favorable tacite"}
        <li
          class="flex items-center gap-3 border-b border-solid border-[color:var(--border-default-grey)] fr-py-1w"
        >
          <span
            class="fr-icon-checkbox-circle-line fr-icon--sm flex-none text-[color:var(--text-action-high-blue-france)]"
            aria-hidden="true"
          ></span>
          <div class="min-w-0 flex-1">
            <span class="fr-hint-text block">Date de l’avis</span>
            <strong class="block">{formatDateAbsolute(avisExpert.avis_date)}</strong>
            {#if !avisExpert.avis_fichier_url}
              <span class="fr-hint-text">
                {avisExpert.avis === "Avis favorable tacite"
                  ? "Avis favorable tacite"
                  : "Aucun fichier lié à ce dossier"}
              </span>
            {/if}
          </div>
          {#if avisExpert.avis_fichier_url}
            <a
              class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-download-line flex-none"
              href={avisExpert.avis_fichier_url}
              data-sveltekit-reload
              aria-label="Télécharger le fichier de l'avis"
            >
              Télécharger
            </a>
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
