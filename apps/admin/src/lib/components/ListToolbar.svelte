<script lang="ts">
  let {
    id,
    label,
    placeholder,
    value,
    onSearch,
    filterOpen = $bindable(false),
    sortOpen = $bindable(false),
    filterCount = 0,
    sortable = true,
    filterId = "filter-panel",
    sortId = "sort-panel",
    onToggleFilter,
  }: {
    id: string;
    label: string;
    placeholder: string;
    value: string;
    onSearch: (value: string) => void;
    filterOpen?: boolean;
    sortOpen?: boolean;
    filterCount?: number;
    sortable?: boolean;
    filterId?: string;
    sortId?: string;
    onToggleFilter?: () => void;
  } = $props();
</script>

<div class="list-toolbar">
  <form role="search" onsubmit={(event) => event.preventDefault()}>
    <label class="search-field" for={id}>
      <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
      <span class="sr-only">{label}</span>
      <input
        {id}
        type="search"
        {value}
        {placeholder}
        autocomplete="off"
        oninput={(event) => onSearch(event.currentTarget.value)}
      />
    </label>
  </form>
  <button
    type="button"
    aria-expanded={filterOpen}
    aria-controls={filterId}
    onclick={() => (onToggleFilter ? onToggleFilter() : (filterOpen = !filterOpen))}
  >
    <span class="fr-icon-filter-line fr-icon--sm" aria-hidden="true"></span>
    Filtrer
    {#if filterCount > 0}<span class="count" aria-label={`${filterCount} filtre(s) actif(s)`}
        >{filterCount}</span
      >{/if}
    <span
      class="fr-icon--sm {filterOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}"
      aria-hidden="true"
    ></span>
  </button>
  {#if sortable}
    <button
      type="button"
      aria-expanded={sortOpen}
      aria-controls={sortId}
      onclick={() => (sortOpen = !sortOpen)}
    >
      <span class="fr-icon-list-ordered fr-icon--sm" aria-hidden="true"></span>
      Trier
      <span
        class="fr-icon--sm {sortOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}"
        aria-hidden="true"
      ></span>
    </button>
  {/if}
</div>

<style>
  .list-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  form {
    flex: 1 1 16rem;
    min-width: 0;
    margin: 0;
  }
  .search-field,
  button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    height: 3rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-lifted-grey);
  }
  .search-field {
    padding: 0 0.875rem;
    color: var(--text-mention-grey);
  }
  .search-field:focus-within {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: 2px;
  }
  input {
    min-width: 0;
    width: 100%;
    height: 100%;
    border: 0;
    padding: 0;
    background: transparent;
    box-shadow: none;
    color: var(--text-default-grey);
    font: inherit;
    font-size: 0.875rem;
  }
  input:focus {
    outline: none;
  }
  button {
    padding: 0 0.875rem;
    font-size: 0.875rem;
    color: var(--text-default-grey);
  }
  button:hover {
    background: var(--background-alt-grey-hover);
  }
  button[aria-expanded="true"] {
    border-color: var(--border-action-high-blue-france);
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
  }
  .count {
    padding: 0.125rem 0.375rem;
    border-radius: 0.375rem;
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
    font-size: 0.75rem;
  }
  @media (max-width: 575px) {
    form {
      flex-basis: 100%;
    }
  }
</style>
