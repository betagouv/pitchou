<script lang="ts">
  import type { Snippet } from "svelte";
  let { title, count, children }: { title: string; count: number; children: Snippet } = $props();
</script>

<section class="list-table" aria-label={title}>
  <header>
    <h2>{title}</h2>
    <span class="count" aria-live="polite">{count}</span>
  </header>
  <div class="table-scroll">{@render children()}</div>
</section>

<style>
  .list-table {
    min-width: 0;
    width: 100%;
    margin-top: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.75rem;
    background: var(--background-lifted-grey);
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1rem;
  }
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .count {
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--background-contrast-grey);
    color: var(--text-mention-grey);
    font-size: 0.75rem;
  }
  .table-scroll {
    position: relative;
    overflow-x: auto;
  }
  .table-scroll :global(table) {
    width: 100%;
    min-width: 48rem;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.875rem;
  }
  .table-scroll :global(th) {
    padding: 0.625rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-mention-grey);
    background: var(--background-alt-grey);
    border-top: 1px solid var(--border-default-grey);
    border-bottom: 1px solid var(--border-default-grey);
  }
  .table-scroll :global(td) {
    padding: 0.875rem 1rem;
    overflow-wrap: anywhere;
    vertical-align: middle;
  }
  .table-scroll :global(tbody tr + tr) {
    border-top: 1px solid var(--border-default-grey);
  }
  .table-scroll :global(tbody tr:hover) {
    background: var(--background-alt-grey-hover);
  }
  .table-scroll :global(tr[role="button"]:focus-visible) {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: -2px;
  }
</style>
