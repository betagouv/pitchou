<script lang="ts">
  import { visiblePages } from "./pagination.ts";
  let {
    current,
    total,
    label,
    compact = false,
    onChange,
  }: {
    current: number;
    total: number;
    label: string;
    compact?: boolean;
    onChange: (page: number) => void;
  } = $props();
  const pages = $derived(visiblePages(current, total));
</script>

<nav aria-label={label} class:compact>
  {#if !compact}<button
      type="button"
      aria-label="Première page"
      title="Première page"
      disabled={current === 1}
      onclick={() => onChange(1)}
      ><span class="fr-icon-arrow-left-s-first-line fr-icon--sm" aria-hidden="true"></span></button
    >{/if}
  <button
    type="button"
    aria-label="Page précédente"
    title="Page précédente"
    disabled={current === 1}
    onclick={() => onChange(current - 1)}
    ><span class="fr-icon-arrow-left-s-line fr-icon--sm" aria-hidden="true"></span></button
  >
  {#if compact}<span class="page-label">Page {current} sur {total}</span>
  {:else}
    {#each pages as page, i}
      {#if i > 0 && page - pages[i - 1] > 1}<span class="ellipsis" aria-hidden="true">…</span>{/if}
      <button
        type="button"
        aria-label={`Page ${page}`}
        aria-current={current === page ? "page" : undefined}
        onclick={() => onChange(page)}>{page}</button
      >
    {/each}
  {/if}
  <button
    type="button"
    aria-label="Page suivante"
    title="Page suivante"
    disabled={current === total}
    onclick={() => onChange(current + 1)}
    ><span class="fr-icon-arrow-right-s-line fr-icon--sm" aria-hidden="true"></span></button
  >
  {#if !compact}<button
      type="button"
      aria-label="Dernière page"
      title="Dernière page"
      disabled={current === total}
      onclick={() => onChange(total)}
      ><span class="fr-icon-arrow-right-s-last-line fr-icon--sm" aria-hidden="true"></span></button
    >{/if}
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0.25rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.375rem;
    color: var(--text-default-grey);
  }
  button[aria-current="page"] {
    border-color: var(--border-action-high-blue-france);
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
    font-weight: 600;
  }
  button:disabled {
    color: var(--text-disabled-grey);
    cursor: not-allowed;
  }
  .page-label {
    padding: 0 0.375rem;
    color: var(--text-mention-grey);
    white-space: nowrap;
  }
  .ellipsis {
    color: var(--text-mention-grey);
  }
  @media (max-width: 575px) {
    nav:not(.compact) {
      gap: 0.125rem;
    }
    nav:not(.compact) button {
      min-width: 1.75rem;
    }
  }
</style>
