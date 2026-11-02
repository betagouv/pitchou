<script lang="ts">
  import type { GroupPreview, PreviewCategory } from "@pitchou/types/groupRouting.ts";
  import GroupPreviewCategory from "./GroupPreviewCategory.svelte";
  let {
    preview,
    name = "",
    input,
    stale,
    onStale,
  }: {
    preview: GroupPreview;
    name?: string;
    input: string;
    stale: boolean;
    onStale: () => void;
  } = $props();
  const changes = $derived([
    { category: "added", label: "Dossiers ajoutés", result: preview.added },
    { category: "removed", label: "Dossiers retirés", result: preview.removed },
    { category: "upgraded", label: "Passages à l'instruction", result: preview.upgraded },
    { category: "downgraded", label: "Passages en lecture complète", result: preview.downgraded },
  ] satisfies {
    category: PreviewCategory;
    label: string;
    result: GroupPreview[PreviewCategory];
  }[]);
  const hasChanges = $derived(changes.some((item) => item.result.count > 0));
</script>

<section class="group-preview" aria-label="Aperçu des affectations">
  <p class="introduction">
    Ces changements seront appliqués à l'enregistrement du groupe{name ? ` « ${name} »` : ""}.
  </p>
  <dl class="counts">
    {#each changes as item}
      <div>
        <dt>{item.label}</dt>
        <dd>{item.result.count.toLocaleString("fr-FR")}</dd>
      </div>
    {/each}
  </dl>
  <p class="notification-note">Aucun e-mail d'arrivée ne sera envoyé pour ce recalcul.</p>
  {#if hasChanges}
    <h3>Dossiers concernés</h3>
    <p class="details-help">Dépliez une catégorie pour consulter les dossiers concernés.</p>
  {:else}
    <p class="unchanged">Aucune affectation ne change.</p>
  {/if}
  {#each changes as item}
    {#if item.result.count}
      <GroupPreviewCategory {...item} token={preview.token} {input} {stale} {onStale} />
    {/if}
  {/each}
</section>

<style>
  .group-preview {
    padding: 1.5rem;
  }
  .introduction {
    margin: 0 0 1.25rem;
    overflow-wrap: anywhere;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0;
  }
  .counts > div {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.25rem;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-alt-grey);
  }
  dt {
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  dd {
    margin: 0;
    color: var(--text-action-high-blue-france);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
  }
  .notification-note,
  .details-help {
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  .notification-note {
    margin: 1rem 0 1.5rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .details-help {
    margin: 0 0 1rem;
  }
  .unchanged {
    margin: 0;
  }
  @media (max-width: 30rem) {
    .group-preview {
      padding: 1rem;
    }
  }
</style>
