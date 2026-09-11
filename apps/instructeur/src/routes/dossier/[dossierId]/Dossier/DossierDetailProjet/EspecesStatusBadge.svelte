<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<span class="fr-badge fr-badge--sm fr-badge--no-icon species-status">{label}</span>

<style>
  .species-status {
    color: var(--text-default-info, #0063cb);
    background: var(--background-contrast-info, #e8edff);
    white-space: nowrap;
  }
</style>
