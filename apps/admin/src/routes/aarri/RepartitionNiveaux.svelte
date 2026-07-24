<script lang="ts">
  import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
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

<section class="flex flex-col gap-3" aria-label="Répartition par niveau AARRI">
  {#if total > 0}
    <div
      class="flex w-full h-6 overflow-hidden rounded-[0.25rem]"
      role="img"
      aria-label={segments
        .map((s) => `${s.label} : ${s.count} (${formatPercent(s.percent)})`)
        .join(", ")}
    >
      {#each segments as segment (segment.niveau)}
        <div
          class="h-full min-w-[2px] [&+&]:border-l [&+&]:border-l-[color:var(--background-default-grey)]"
          style="width: {segment.percent}%; background-color: {segment.color};"
          title="{segment.label} : {segment.count} ({formatPercent(segment.percent)})"
        ></div>
      {/each}
    </div>

    <ul class="flex flex-wrap gap-[0.5rem_1.5rem] fr-m-0 fr-p-0 list-none">
      {#each segments as segment (segment.niveau)}
        <li class="flex items-center gap-[0.375rem]">
          <span
            class="w-[0.875rem] h-[0.875rem] rounded-[0.1875rem] flex-shrink-0"
            style="background-color: {segment.color};"
            aria-hidden="true"
          ></span>
          <span>{segment.label}</span>
          <span class="fr-text--bold">{segment.count}</span>
          <span class="text-[color:var(--text-mention-grey)]"
            >({formatPercent(segment.percent)})</span
          >
        </li>
      {/each}
    </ul>
  {/if}
</section>
