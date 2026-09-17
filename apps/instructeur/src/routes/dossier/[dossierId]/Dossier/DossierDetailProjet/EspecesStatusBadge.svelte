<script lang="ts">
  import type { StatutListeRouge } from "@pitchou/types/especes.d.ts";

  let { label, tone = "info" }: { label: string; tone?: "info" | StatutListeRouge } = $props();
</script>

<span class="fr-badge fr-badge--sm fr-badge--no-icon species-status species-status--{tone}"
  >{label}</span
>

<style>
  .species-status {
    white-space: nowrap;
  }
  .species-status--info {
    color: var(--text-default-info, #0063cb);
    background: var(--background-contrast-info, #e8edff);
  }
  /* Red-list categories use the DSFR error, warning and yellow tournesol badge colours,
     from the most threatened (CR) to the least (VU). */
  .species-status--CR {
    color: var(--text-default-error, #ce0500);
    background: var(--background-contrast-error, #ffe9e9);
  }
  .species-status--EN {
    color: var(--text-default-warning, #b34000);
    background: var(--background-contrast-warning, #ffe9e6);
  }
  .species-status--VU {
    color: var(--text-label-yellow-tournesol, #716043);
    background: var(--background-contrast-yellow-tournesol, #feecc2);
  }
</style>
