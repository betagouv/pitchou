<script lang="ts" generics="Id extends string | number">
  let {
    heading,
    items,
    emptyText,
    onRemove,
  }: {
    heading: string;
    items: { id: Id; label: string; status?: string }[];
    emptyText: string;
    onRemove: (id: Id) => void;
  } = $props();
</script>

<section aria-label={heading}>
  <h3>{heading} <span class="count">{items.length}</span></h3>
  {#if items.length > 0}
    <ul>
      {#each items as item (item.id)}
        <li>
          <span class="entry-label">{item.label}</span>
          {#if item.status}<span class="status">{item.status}</span>{/if}
          <button
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line"
            type="button"
            aria-label={`Retirer ${item.label}`}
            title={`Retirer ${item.label}`}
            onclick={() => onRemove(item.id)}
          ></button>
        </li>
      {/each}
    </ul>
  {:else}<p>{emptyText}</p>{/if}
</section>

<style>
  section {
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.625rem;
    background: var(--background-default-grey);
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.9375rem;
  }
  .count {
    border-radius: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: var(--background-contrast-grey);
    font-size: 0.75rem;
  }
  ul {
    padding: 0;
    margin: 0.875rem 0 0;
    list-style: none;
    display: grid;
    gap: 0.375rem;
  }
  li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  .entry-label {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  button {
    flex-shrink: 0;
  }
  .status {
    font-size: 0.75rem;
    color: var(--text-default-warning);
  }
  p {
    margin: 0.75rem 0 0;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
</style>
