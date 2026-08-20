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
  class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:border-gray-400 hover:shadow-md"
  aria-haspopup="dialog"
  aria-label="Modifier l'activité « {item.activite.label} »"
  onclick={() => onSelect(item)}
>
  <span
    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
    style="background-color: {color}"
  >
    <img src={activiteIconUrl(item.activite.code)} alt="" class="h-7 w-7" />
  </span>
  <span class="min-w-0 grow">
    <span class="block font-bold leading-tight">{item.activite.label}</span>
    <span class="block text-xs text-gray-500">
      {item.labels.length}
      {item.labels.length > 1 ? "libellés DN" : "libellé DN"}
    </span>
  </span>
  {#if needsReview}
    <span class="fr-badge fr-badge--sm fr-badge--warning shrink-0">À vérifier</span>
  {/if}
  <span class="fr-icon-arrow-right-s-line shrink-0 text-gray-400" aria-hidden="true"></span>
</button>
