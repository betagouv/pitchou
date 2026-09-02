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
    unread: boolean;
    onOpenFollowers: () => void;
    onAddPieceJointe: () => void;
    /** Marks the dossier read/unread for the current instructeur. */
    onSetRead: (viewed: boolean) => void;
    /** Switches the dossier to read-only mode. */
    onEnterReadOnly: () => void;
  };

  let {
    dossier,
    email,
    followersLabel,
    followedByCurrentInstructeur,
    unread,
    onOpenFollowers,
    onAddPieceJointe,
    onSetRead,
    onEnterReadOnly,
  }: Props = $props();

  const readOnly = readOnlyMode();

  const readLabel = $derived(
    unread ? "Marquer le dossier comme lu" : "Marquer le dossier comme non lu",
  );
</script>

<div class="flex flex-wrap items-center gap-3">
  <!-- Read-only mode hides every write action, so the followers are shown as
       plain text rather than as a way to open the modal. -->
  {#if readOnly.current}
    <p class="fr-mb-0 fr-text--sm max-w-[16rem] truncate">{followersLabel}</p>
  {:else}
    <button
      type="button"
      class="fr-link fr-text--sm max-w-[16rem] truncate"
      onclick={onOpenFollowers}
    >
      {followersLabel}
    </button>

    {#if typeof followedByCurrentInstructeur === "boolean"}
      {#if followedByCurrentInstructeur}
        <button
          onclick={() => instructeurLeavesDossier(email, dossier.id)}
          class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left"
          >Vous suivez ce dossier</button
        >
      {:else}
        <button
          onclick={() => instructeurFollowsDossier(email, dossier.id)}
          class="fr-btn fr-btn--sm fr-icon-star-line fr-btn--icon-left">Suivre ce dossier</button
        >
      {/if}
    {/if}

    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm {unread
        ? 'fr-icon-mail-open-line'
        : 'fr-icon-mail-line'}"
      title={readLabel}
      onclick={() => onSetRead(unread)}
    >
      {readLabel}
    </button>

    <DossierActionsMenu
      dossierId={dossier.id}
      dossierName={dossier.name}
      extraItems={[
        { label: "Ajouter une pièce jointe", onClick: onAddPieceJointe },
        { label: "Voir le dossier en lecture seule", onClick: onEnterReadOnly },
      ]}
    />
  {/if}
</div>
