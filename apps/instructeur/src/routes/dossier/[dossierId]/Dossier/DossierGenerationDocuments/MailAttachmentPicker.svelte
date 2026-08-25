<script lang="ts">
  import { byteFormat } from "@pitchou/common/typeFormat.ts";
  import type { PieceJointeGroup, PieceJointeSimple } from "../piecesJointes.ts";

  type Props = {
    groups: PieceJointeGroup[];
    documentName: string;
    selectedUrls: string[];
    attachGeneratedDocument: boolean;
  };

  let {
    groups,
    documentName,
    selectedUrls = $bindable(),
    attachGeneratedDocument = $bindable(),
  }: Props = $props();

  const allUrls = $derived(
    groups.flatMap((group) => group.pieces.filter((piece) => piece.url).map((piece) => piece.url)),
  );
  const allSelected = $derived(allUrls.length > 0 && selectedUrls.length === allUrls.length);

  function name(piece: PieceJointeSimple) {
    return piece.description?.name || piece.label;
  }

  function details(piece: PieceJointeSimple) {
    const values = [piece.label];
    if (typeof piece.description?.size === "number") {
      values.push(byteFormat.format(piece.description.size));
    }
    return values.join(" · ");
  }

  function toggle(url: string) {
    selectedUrls = selectedUrls.includes(url)
      ? selectedUrls.filter((selected) => selected !== url)
      : [...selectedUrls, url];
  }
</script>

{#snippet fileRow(id: string, label: string, hint: string, checked: boolean, onToggle: () => void)}
  <label
    class="flex items-center gap-3 fr-py-1w fr-px-2w rounded-[0.25rem] cursor-pointer hover:bg-[var(--background-contrast-grey)] has-[:checked]:bg-[var(--background-contrast-grey)]"
    for={id}
  >
    <input class="shrink-0" type="checkbox" {id} {checked} onchange={onToggle} />
    <span class="min-w-0 flex-1">
      <span class="block truncate">{label}</span>
      <span class="block fr-text--xs fr-m-0 text-[var(--text-mention-grey)]">{hint}</span>
    </span>
  </label>
{/snippet}

<section
  class="fr-p-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)]"
>
  <div class="flex items-baseline justify-between gap-4 flex-wrap fr-mb-1w">
    <h3 class="fr-h6 fr-m-0">Pièces jointes</h3>
    {#if allUrls.length > 0}
      <button
        type="button"
        class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
        onclick={() => (selectedUrls = allSelected ? [] : allUrls)}
      >
        {allSelected ? "Tout décocher" : "Tout cocher"}
      </button>
    {/if}
  </div>

  <p class="fr-text--sm fr-mb-2w text-[var(--text-mention-grey)]">
    Un mail ne peut pas être pré-rempli avec des pièces jointes. Les fichiers cochés sont
    téléchargés sur votre ordinateur, puis vous les glissez dans le mail. Votre navigateur peut
    demander l'autorisation de télécharger plusieurs fichiers.
  </p>

  <div class="flex flex-col gap-1">
    {@render fileRow(
      "mail-piece-document",
      documentName,
      "Document généré",
      attachGeneratedDocument,
      () => (attachGeneratedDocument = !attachGeneratedDocument),
    )}
  </div>

  {#each groups as group}
    <h4
      class="fr-text--xs fr-mb-1v fr-mt-2w uppercase tracking-wide text-[var(--text-mention-grey)]"
    >
      {group.title}
    </h4>
    <div class="flex flex-col gap-1">
      {#each group.pieces.filter((piece) => piece.url) as piece}
        {@render fileRow(
          `mail-piece-${piece.url}`,
          name(piece),
          details(piece),
          selectedUrls.includes(piece.url),
          () => toggle(piece.url),
        )}
      {/each}
    </div>
  {/each}

  {#if groups.length === 0}
    <p class="fr-text--sm fr-mt-2w fr-mb-0 text-[var(--text-mention-grey)]">
      Ce dossier n'a aucune autre pièce jointe.
    </p>
  {/if}
</section>
