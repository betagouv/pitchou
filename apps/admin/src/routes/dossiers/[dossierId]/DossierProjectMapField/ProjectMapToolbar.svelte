<script lang="ts">
  import type { ProjectMapMode } from "./geometry.ts";

  type Props = {
    mode: ProjectMapMode;
    draftCount: number;
    busy: boolean;
    onSelect: (mode: ProjectMapMode) => void;
    onFinishLine: () => void;
  };
  let { mode, draftCount, busy, onSelect, onFinishLine }: Props = $props();

  const tools: [ProjectMapMode, string][] = [
    ["navigate", "Déplacer"],
    ["point", "Point"],
    ["line", "Ligne"],
    ["polygon", "Polygone"],
    ["rectangle", "Rectangle"],
    ["parcel", "Parcelle cadastrale"],
  ];
</script>

<div class="flex gap-2 flex-wrap fr-mb-2w" role="toolbar" aria-label="Outils cartographiques">
  {#each tools as tool (tool[0])}
    <button
      type="button"
      class="fr-btn fr-btn--sm"
      class:fr-btn--secondary={mode !== tool[0]}
      aria-pressed={mode === tool[0]}
      disabled={busy}
      onclick={() => onSelect(tool[0])}>{tool[1]}</button
    >
  {/each}
  {#if ["line", "polygon"].includes(mode) && draftCount >= (mode === "polygon" ? 3 : 2)}
    <button type="button" class="fr-btn fr-btn--sm" onclick={onFinishLine}>
      Terminer {mode === "polygon" ? "le polygone" : "la ligne"}
    </button>
  {/if}
</div>
<p class="fr-hint-text fr-mt-0">
  {["line", "polygon"].includes(mode)
    ? `Cliquez pour ajouter des sommets, puis double-cliquez ou terminez ${mode === "polygon" ? "le polygone" : "la ligne"}.`
    : mode === "rectangle"
      ? "Cliquez sur deux coins opposés du rectangle."
      : mode === "parcel"
        ? "Cliquez sur une parcelle cadastrale pour l'ajouter."
        : "Choisissez un outil puis cliquez sur la carte."}
</p>
