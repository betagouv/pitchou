<script lang="ts">
  let { label, tone = "info" }: { label: string; tone?: "info" | "menace" } = $props();
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
  /* Rose/violet, the DSFR glycine badge, for threatened red-list categories. */
  .species-status--menace {
    color: var(--purple-glycine-sun-319-moon-630, #6e445a);
    background: var(--purple-glycine-950-100, #fee7fc);
  }
</style>
