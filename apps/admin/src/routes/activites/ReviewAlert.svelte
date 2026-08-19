<script lang="ts">
  import type { ActiviteAdmin, ActiviteLabelAdmin } from "$lib/actions/adminActivites.ts";
  import { AUTRE_ACTIVITE_CODE } from "$lib/actions/adminActivites.ts";

  type Props = {
    labels: ActiviteLabelAdmin[];
    activites: ActiviteAdmin[];
    onReassign: (label: string, activiteCode: string) => Promise<void>;
  };

  let { labels, activites, onReassign }: Props = $props();

  // Pending select value per label; labels not touched yet stay on « Autre ».
  let selection = $state<Record<string, string>>({});
  let busyLabel = $state<string | null>(null);

  async function validate(label: string) {
    busyLabel = label;
    try {
      await onReassign(label, selection[label] ?? AUTRE_ACTIVITE_CODE);
    } catch {
      // The page displays the error; the row only needs to leave its busy state.
    } finally {
      busyLabel = null;
    }
  }
</script>

<div class="fr-alert fr-alert--warning fr-mb-3w" role="alert">
  <h3 class="fr-alert__title">
    {labels.length === 1
      ? "Un nouveau libellé d'activité a été détecté"
      : `${labels.length} nouveaux libellés d'activité ont été détectés`}
  </h3>
  <p>
    Ces libellés proviennent de la synchronisation avec Démarches Numériques et ont été rattachés
    automatiquement à l'activité « Autre ». Veuillez les passer en revue : acceptez le rattachement
    à « Autre », ou choisissez l'activité à laquelle les rattacher (par exemple si l'activité a
    simplement été renommée dans Démarches Numériques).
  </p>

  <ul class="fr-mt-2w list-none p-0 flex flex-col gap-2">
    {#each labels as { label } (label)}
      <li class="flex flex-wrap items-center gap-3 rounded bg-white p-3">
        <strong class="mr-auto">{label}</strong>
        <select
          class="fr-select !w-auto !mt-0"
          aria-label="Activité de rattachement pour « {label} »"
          value={selection[label] ?? AUTRE_ACTIVITE_CODE}
          onchange={(event) => (selection[label] = event.currentTarget.value)}
        >
          {#each activites as activite (activite.code)}
            <option value={activite.code}>{activite.label}</option>
          {/each}
        </select>
        <button
          type="button"
          class="fr-btn fr-btn--sm"
          disabled={busyLabel !== null}
          onclick={() => validate(label)}
        >
          {(selection[label] ?? AUTRE_ACTIVITE_CODE) === AUTRE_ACTIVITE_CODE
            ? "Accepter comme « Autre »"
            : "Rattacher à cette activité"}
        </button>
      </li>
    {/each}
  </ul>
</div>
