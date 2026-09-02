<script lang="ts"></script>

<div role="status" aria-live="polite">
  <p class="fr-sr-only">Préparation du mail à partir du dossier...</p>
  <div class="animate-pulse" aria-hidden="true">
    <div class="h-5 w-28 rounded bg-[var(--background-contrast-grey)] fr-mb-1w"></div>
    <div class="h-10 rounded bg-[var(--background-contrast-grey)] fr-mb-3w"></div>
    <div class="h-5 w-40 rounded bg-[var(--background-contrast-grey)] fr-mb-1w"></div>
    <div class="h-24 rounded bg-[var(--background-contrast-grey)] fr-mb-3w"></div>
    <div class="grid grid-cols-1 gap-4 fr-mb-3w sm:grid-cols-2">
      {#each Array(4) as _}
        <div class="h-32 rounded bg-[var(--background-contrast-grey)]"></div>
      {/each}
    </div>
    <div class="h-64 rounded bg-[var(--background-contrast-grey)]"></div>
  </div>
</div>
