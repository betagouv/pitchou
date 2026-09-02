<script lang="ts">
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import type File from "@pitchou/types/database/public/File.ts";
  import type { PieceJointeGroup, PieceJointeSimple } from "./piecesJointes.ts";

  let {
    groups,
    selectedIds,
    onSelectedIdsChange,
  }: {
    groups: PieceJointeGroup[];
    selectedIds: File["id"][];
    onSelectedIdsChange: (selectedIds: File["id"][]) => void;
  } = $props();
  let expanded = $state(false);
  const contentId = "cnpn-attachments-content";

  const selectable = $derived(
    groups.flatMap((group) => group.pieces).filter((piece) => piece.fileId),
  );
  const totalSize = $derived(
    selectable
      .filter((piece) => piece.fileId && selectedIds.includes(piece.fileId))
      .reduce((sum, piece) => sum + (piece.description?.size ?? 0), 0),
  );

  function toggle(piece: PieceJointeSimple) {
    if (!piece.fileId) return;
    onSelectedIdsChange(
      selectedIds.includes(piece.fileId)
        ? selectedIds.filter((id) => id !== piece.fileId)
        : [...selectedIds, piece.fileId],
    );
  }
</script>

<section class="overflow-hidden rounded border border-solid border-[var(--border-default-grey)]">
  <h3 class="fr-m-0">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-3 border-0 bg-transparent text-left transition-colors fr-p-2w hover:bg-[var(--background-contrast-grey)]"
      aria-expanded={expanded}
      aria-controls={contentId}
      onclick={() => (expanded = !expanded)}
    >
      <span class="fr-h6 fr-m-0">Pièces jointes</span>
      <span class="flex items-center gap-2">
        <span class="fr-text--sm fr-m-0 font-normal text-[var(--text-mention-grey)]">
          {selectedIds.length} sélectionnée{selectedIds.length > 1 ? "s" : ""}
          {#if totalSize > 0}
            · {byteFormat.format(totalSize)}{/if}
        </span>
        <span
          class={expanded ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"}
          aria-hidden="true"
        ></span>
      </span>
    </button>
  </h3>

  {#if expanded}
    <div id={contentId} class="fr-p-2w">
      <p class="fr-hint-text fr-mb-2w">20 fichiers maximum, pour un total de 15 Mo.</p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {#each groups as group}
          {@const pieces = group.pieces.filter((piece) => piece.fileId)}
          {#if pieces.length > 0}
            <div class="rounded bg-[var(--background-alt-grey)] fr-p-2w">
              <h4 class="fr-text--sm fr-text--bold fr-mb-1w">{group.title}</h4>
              <div class="flex flex-col gap-1">
                {#each pieces as piece}
                  <label
                    class="flex cursor-pointer items-start gap-3 rounded fr-p-1w hover:bg-[var(--background-contrast-grey)]"
                  >
                    <input
                      class="fr-mt-1v shrink-0"
                      type="checkbox"
                      checked={piece.fileId ? selectedIds.includes(piece.fileId) : false}
                      onchange={() => toggle(piece)}
                    />
                    <span class="min-w-0">
                      <span class="block [overflow-wrap:anywhere]">
                        {piece.description?.name ?? piece.label}
                      </span>
                      <span class="fr-hint-text block">
                        {piece.label}
                        {#if piece.description?.size}
                          · {byteFormat.format(piece.description.size)}
                        {/if}
                      </span>
                    </span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      {#if selectable.length === 0}
        <p class="fr-text--sm fr-mb-0">Aucune pièce jointe n'est disponible dans ce dossier.</p>
      {/if}
    </div>
  {/if}
</section>
