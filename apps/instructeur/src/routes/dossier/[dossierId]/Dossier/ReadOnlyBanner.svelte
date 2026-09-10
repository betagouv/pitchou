<script lang="ts">
  type Props = {
    /**
     * Leaves read-only mode. Omitted for someone who has no right to edit the
     * dossier anyway — they get the notice without a way out of it.
     */
    onLeave?: () => void;
  };

  let { onLeave }: Props = $props();
</script>

<!-- The notice cannot be dismissed: what it says stays true for the whole
     visit, and read-only mode has no other visible marker. -->
<div class="fr-mt-1w flex items-stretch" role="status">
  <span
    class="flex w-8 flex-none items-center justify-center bg-[var(--background-action-high-blue-france)]"
  >
    <span
      class="fr-icon-information-fill fr-icon--sm text-[color:var(--text-inverted-blue-france)]"
      aria-hidden="true"
    ></span>
  </span>
  <div
    class="flex min-w-0 grow flex-wrap items-center gap-x-4 gap-y-1 border border-[color:var(--border-default-blue-france)] fr-py-1w fr-pl-2w fr-pr-1w"
  >
    <p class="fr-mb-0 fr-text--sm">Dossier en lecture seule</p>
    {#if onLeave}
      <button type="button" class="fr-btn fr-btn--secondary fr-btn--sm ml-auto" onclick={onLeave}>
        Repasser en mode édition
      </button>
    {/if}
  </div>
</div>
