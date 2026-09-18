<script lang="ts">
  import DossierActionsMenu from "$lib/components/DossierFollowerAssignment/DossierActionsMenu.svelte";
  import {
    instructeurFollowsDossier,
    instructeurLeavesDossier,
  } from "$lib/dossier/suiviDossier.ts";
  import { readOnlyMode } from "../readOnly.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierFull;
    email: string;
    followersLabel: string;
    followedByCurrentInstructeur: boolean | undefined;
    onOpenFollowers: () => void;
    onAddPieceJointe: () => void;
    /** Switches the dossier to read-only mode. */
    onEnterReadOnly: () => void;
  };

  let {
    dossier,
    email,
    followersLabel,
    followedByCurrentInstructeur,
    onOpenFollowers,
    onAddPieceJointe,
    onEnterReadOnly,
  }: Props = $props();

  const readOnly = readOnlyMode();
</script>

<div class="flex flex-wrap items-center gap-4">
  <!-- Read-only mode hides every write action, so the followers are shown as
       plain text rather than as a way to open the modal. -->
  {#if readOnly.current}
    <p class="fr-mb-0 fr-text--sm followers-label">{followersLabel}</p>
  {:else}
    <button
      type="button"
      class="fr-link fr-text--sm followers-label editable-followers"
      onclick={onOpenFollowers}
    >
      {followersLabel}
    </button>

    {#if typeof followedByCurrentInstructeur === "boolean"}
      {#if followedByCurrentInstructeur}
        <button
          onclick={() => instructeurLeavesDossier(email, dossier.id)}
          type="button"
          class="fr-btn fr-btn--secondary follow-button fr-icon-star-fill fr-btn--icon-left"
          >Vous suivez ce dossier</button
        >
      {:else}
        <button
          onclick={() => instructeurFollowsDossier(email, dossier.id)}
          type="button"
          class="fr-btn fr-btn--secondary follow-button fr-icon-star-line fr-btn--icon-left"
          >Suivre ce dossier</button
        >
      {/if}
    {/if}

    <DossierActionsMenu
      dossierId={dossier.id}
      dossierName={dossier.name}
      showDeadline={false}
      outlined
      extraItems={[
        {
          label: "Ajouter une pièce jointe",
          icon: "fr-icon-attachment-line",
          onClick: onAddPieceJointe,
        },
        {
          label: "Voir le dossier en lecture seule",
          icon: "fr-icon-eye-line",
          onClick: onEnterReadOnly,
        },
      ]}
    />
  {/if}
</div>

<style>
  .followers-label {
    overflow-wrap: anywhere;
  }

  .editable-followers {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .follow-button {
    --border-action-high-blue-france: var(--blue-france-main-525, #6a6af4);
    --hover: transparent;
    --active: transparent;
    min-height: 40px;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .follow-button::before {
    color: var(--blue-france-main-525, #6a6af4);
  }

  .follow-button:hover {
    --border-action-high-blue-france: #000091;
  }
</style>
