<script lang="ts">
  import type { UtilisateurAARRI } from "$types/API_Pitchou.ts";
  import { NIVEAUX, NIVEAU_LABELS, NIVEAU_COLOR_VAR, countByNiveau } from "./utilisateursList.ts";

  type Props = {
    utilisateurs: UtilisateurAARRI[];
  };

  let { utilisateurs }: Props = $props();

  const total = $derived(utilisateurs.length);
  const counts = $derived(countByNiveau(utilisateurs));

  // Legend / bar segments, in funnel order, skipping levels with no utilisateur.
  const segments = $derived(
    NIVEAUX.map((niveau) => ({
      niveau,
      label: NIVEAU_LABELS[niveau],
      color: NIVEAU_COLOR_VAR[niveau],
      count: counts[niveau],
      percent: total > 0 ? (counts[niveau] / total) * 100 : 0,
    })).filter((segment) => segment.count > 0),
  );

  function formatPercent(percent: number): string {
    return `${Math.round(percent)} %`;
  }
</script>

<section class="repartition" aria-label="Répartition par niveau AARRI">
  {#if total > 0}
    <div
      class="bar"
      role="img"
      aria-label={segments
        .map((s) => `${s.label} : ${s.count} (${formatPercent(s.percent)})`)
        .join(", ")}
    >
      {#each segments as segment (segment.niveau)}
        <div
          class="segment"
          style="width: {segment.percent}%; background-color: {segment.color};"
          title="{segment.label} : {segment.count} ({formatPercent(segment.percent)})"
        ></div>
      {/each}
    </div>

    <ul class="legend">
      {#each segments as segment (segment.niveau)}
        <li class="legend-item">
          <span class="swatch" style="background-color: {segment.color};" aria-hidden="true"></span>
          <span class="legend-label">{segment.label}</span>
          <span class="legend-count fr-text--bold">{segment.count}</span>
          <span class="legend-percent">({formatPercent(segment.percent)})</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style lang="scss">
  .repartition {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .bar {
    display: flex;
    width: 100%;
    height: 1.5rem;
    overflow: hidden;
    border-radius: 0.25rem;
  }

  .segment {
    height: 100%;
    min-width: 2px;
  }

  .segment + .segment {
    border-left: 1px solid var(--background-default-grey);
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .swatch {
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 0.1875rem;
    flex-shrink: 0;
  }

  .legend-percent {
    color: var(--text-mention-grey);
  }
</style>
