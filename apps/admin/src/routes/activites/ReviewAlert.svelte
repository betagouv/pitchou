<script lang="ts">
  import CollapsibleNotice from "$lib/components/CollapsibleNotice.svelte";
  import type { ActiviteLabelAdmin } from "$lib/actions/adminActivites.ts";

  type Props = {
    labels: ActiviteLabelAdmin[];
    /** Opens the edit modal of the activity currently holding the label. */
    onReview: (activiteCode: string) => void;
  };

  let { labels, onReview }: Props = $props();

  const title = $derived(
    labels.length === 1
      ? "Un nouveau libellé d'activité a été détecté"
      : `${labels.length} nouveaux libellés d'activité ont été détectés`,
  );
</script>

<CollapsibleNotice {title} variant="warning">
  <div class="flex flex-col gap-2">
    <p class="!m-0 text-sm">
      Ces libellés proviennent de la synchronisation avec Démarches Numériques et ont été rattachés
      automatiquement à l'activité « Autre ». Passez-les en revue : acceptez le rattachement, ou
      choisissez l'activité à laquelle les rattacher.
    </p>

    <ul class="!m-0 flex list-none flex-col gap-2 !p-0">
      {#each labels as { label, activite_code } (label)}
        <li
          class="flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] p-3 shadow-sm"
        >
          <span class="grow font-bold leading-tight">{label}</span>
          <button
            type="button"
            class="fr-btn fr-btn--sm fr-btn--secondary shrink-0"
            onclick={() => onReview(activite_code)}
          >
            Passer en revue
          </button>
        </li>
      {/each}
    </ul>
  </div>
</CollapsibleNotice>
