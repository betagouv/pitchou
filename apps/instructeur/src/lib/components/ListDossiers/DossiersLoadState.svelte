<script lang="ts">
  let {
    loading,
    loadError,
    onRetry,
  }: {
    loading: boolean;
    loadError: string;
    onRetry?: () => void;
  } = $props();
</script>

<section aria-label="Liste des dossiers" aria-busy={loading} class="min-h-[32rem] fr-pt-4w">
  {#if loading}
    <div aria-hidden="true" class="flex flex-col gap-2 fr-mt-3w">
      {#each Array(5) as _}
        <div
          class="h-20 rounded border border-[var(--border-default-grey)] bg-[var(--background-contrast-grey)]"
        ></div>
      {/each}
    </div>
  {:else}
    <div class="fr-alert fr-alert--error" role="alert">
      <h2 class="fr-alert__title">Impossible de charger les dossiers</h2>
      <p>{loadError}</p>
      {#if onRetry}
        <button type="button" class="fr-btn fr-btn--secondary fr-mt-2w" onclick={onRetry}
          >Réessayer</button
        >
      {/if}
      <a class="fr-link fr-ml-2w" href="/auth/login">Se reconnecter</a>
    </div>
  {/if}
</section>
