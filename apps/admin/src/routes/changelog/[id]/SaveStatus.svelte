<script lang="ts">
  import type { SaveState } from "./autosave.svelte.ts";

  let { state, error }: { state: SaveState; error: string | null } = $props();
</script>

<div role="status" aria-live="polite">
  {#if state === "error"}
    <p class="fr-text--sm fr-error-text fr-mt-0 fr-mb-0">
      Échec de l'enregistrement : {error}
    </p>
  {:else if state === "pending" || state === "saving"}
    <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
      <span class="fr-icon-refresh-line inline-block animate-spin fr-mr-1v" aria-hidden="true"
      ></span>
      Enregistrement…
    </p>
  {:else if state === "saved"}
    <p class="fr-text--sm fr-text-mention--grey fr-mb-0">
      <span class="fr-icon-check-line fr-mr-1v" aria-hidden="true"></span>
      Enregistré
    </p>
  {:else}
    <p class="fr-text--sm fr-text-mention--grey fr-mb-0">Enregistrement automatique</p>
  {/if}
</div>
