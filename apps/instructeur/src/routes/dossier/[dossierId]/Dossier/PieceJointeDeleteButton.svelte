<script lang="ts">
  import ModalDeletePieceJointe from "./ModalDeletePieceJointe.svelte";
  import { readOnlyMode } from "./readOnly.ts";
  import type { PieceJointeSimple } from "./piecesJointes.ts";

  let {
    piece,
    onDelete,
  }: {
    piece: PieceJointeSimple;
    onDelete: (piece: PieceJointeSimple) => Promise<void>;
  } = $props();
  const readOnly = readOnlyMode();
  let confirming = $state(false);
</script>

{#if !readOnly.current}
  <button
    type="button"
    class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line shrink-0"
    title="Supprimer {piece.description?.name || piece.label}"
    onclick={() => (confirming = true)}>Supprimer {piece.description?.name || piece.label}</button
  >
  {#if confirming}
    <ModalDeletePieceJointe
      {piece}
      onDelete={() => onDelete(piece)}
      onClose={() => (confirming = false)}
    />
  {/if}
{/if}
