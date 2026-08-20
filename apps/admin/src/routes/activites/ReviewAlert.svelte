<script lang="ts">
  import type { ActiviteLabelAdmin } from "$lib/actions/adminActivites.ts";

  type Props = {
    labels: ActiviteLabelAdmin[];
    /** Opens the edit modal of the activity currently holding the label. */
    onReview: (activiteCode: string) => void;
  };

  let { labels, onReview }: Props = $props();
</script>

<section
  class="fr-mb-3w overflow-hidden rounded-xl border border-amber-300"
  role="alert"
  aria-label="Nouveaux libellés d'activité à passer en revue"
>
  <header class="flex items-center gap-2 bg-amber-200 px-5 py-3">
    <span class="fr-icon-warning-line" aria-hidden="true"></span>
    <h2 class="fr-h6 !m-0">
      {labels.length === 1
        ? "Un nouveau libellé d'activité a été détecté"
        : `${labels.length} nouveaux libellés d'activité ont été détectés`}
    </h2>
  </header>

  <div class="flex flex-col gap-3 bg-amber-50 p-4">
    <p class="!m-0 text-sm text-gray-700">
      Ces libellés proviennent de la synchronisation avec Démarches Numériques et ont été rattachés
      automatiquement à l'activité « Autre ». Passez-les en revue : acceptez le rattachement, ou
      choisissez l'activité à laquelle les rattacher (par exemple si l'activité a simplement été
      renommée dans Démarches Numériques).
    </p>

    <ul class="!m-0 flex list-none flex-col gap-2 !p-0">
      {#each labels as { label, activite_code } (label)}
        <li
          class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
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
</section>
