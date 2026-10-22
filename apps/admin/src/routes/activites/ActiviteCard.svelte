<script lang="ts">
  import { activiteIconUrl } from "@pitchou/ui/activites/activiteIcon.ts";
  import type { ActiviteWithLabels } from "./activitesModel.ts";

  type Props = {
    item: ActiviteWithLabels;
    /** Color of the group the activity belongs to, used behind its icon. */
    color: string;
    onSelect: (item: ActiviteWithLabels) => void;
  };

  let { item, color, onSelect }: Props = $props();

  const needsReview = $derived(item.labels.some(({ needs_review }) => needs_review));
</script>

<button
  type="button"
  class="flex items-center gap-3 rounded-lg border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 text-left hover:bg-[var(--background-alt-grey-hover)]"
  aria-haspopup="dialog"
  aria-label="Modifier l'activité « {item.activite.label} »"
  onclick={() => onSelect(item)}
>
  <span
    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
    style="background-color: {color}"
  >
    <img src={activiteIconUrl(item.activite.code)} alt="" class="h-6 w-6" />
  </span>
  <span class="min-w-0 grow">
    <span class="block text-sm font-semibold leading-tight">{item.activite.label}</span>
    <span class="block text-xs text-[color:var(--text-mention-grey)]">
      {item.labels.length}
      {item.labels.length > 1 ? "libellés DN" : "libellé DN"}
    </span>
  </span>
  {#if needsReview}
    <span class="fr-badge fr-badge--sm fr-badge--warning shrink-0">À vérifier</span>
  {/if}
  <span
    class="fr-icon-arrow-right-s-line shrink-0 text-[color:var(--text-mention-grey)]"
    aria-hidden="true"
  ></span>
</button>
