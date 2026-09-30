<script lang="ts">
  import type { PieceJointeSimple } from "./piecesJointes.ts";

  let {
    piece,
    onDelete,
    onClose,
  }: {
    piece: PieceJointeSimple;
    onDelete: () => Promise<void>;
    onClose: () => void;
  } = $props();

  const titleId = $props.id();
  let dialog: HTMLDialogElement;
  let deleting = $state(false);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    dialog.showModal();
  });

  async function confirm() {
    deleting = true;
    errorMessage = null;
    try {
      await onDelete();
      dialog.close();
    } catch (cause) {
      errorMessage = cause instanceof Error ? cause.message : "La suppression a échoué.";
    } finally {
      deleting = false;
    }
  }
</script>

<dialog
  bind:this={dialog}
  aria-labelledby={titleId}
  onclose={onClose}
  oncancel={(event) => {
    if (deleting) event.preventDefault();
  }}
  class="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-[36rem] border-0 fr-p-4w bg-[var(--background-default-grey)] text-[var(--text-default-grey)] backdrop:bg-black/40"
>
  <h2 id={titleId} class="fr-h5">
    Voulez-vous supprimer {piece.description?.name || piece.label} ?
  </h2>
  {#if errorMessage}<p role="alert" class="fr-error-text">{errorMessage}</p>{/if}
  <div class="flex flex-wrap gap-4 justify-end">
    <button
      type="button"
      class="fr-btn fr-btn--secondary"
      disabled={deleting}
      onclick={() => dialog.close()}>Annuler</button
    >
    <button type="button" class="fr-btn" disabled={deleting} onclick={confirm}
      >{deleting ? "Suppression en cours…" : "Confirmer la suppression"}</button
    >
  </div>
</dialog>
