<script lang="ts">
  import Pagination from "./Pagination.svelte";
  let {
    pageSelectors,
    currentPage,
  }: {
    pageSelectors: [undefined, ...Array<() => void>];
    currentPage: (() => void) | undefined;
  } = $props();
  const current = $derived(Math.max(1, pageSelectors.indexOf(currentPage)));
  const total = $derived(pageSelectors.length - 1);
</script>

<div class="pagination-footer">
  <span>Page {current} sur {total}</span>
  <Pagination {current} {total} label="Pagination" onChange={(page) => pageSelectors[page]?.()} />
</div>

<style>
  .pagination-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0;
    font-size: 0.8125rem;
    color: var(--text-mention-grey);
  }
</style>
