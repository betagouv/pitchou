<script lang="ts">
  import { SORT_OPTIONS, type SortKey, type SortOrder } from "./utilisateursList.ts";

  type Props = {
    selectedSort: SortKey;
    sortOrder: SortOrder;
    onChange: (sort: SortKey, order: SortOrder) => void;
  };

  let { selectedSort, sortOrder, onChange }: Props = $props();

  // Select the option, or flip the direction if it is already the active one.
  // A freshly selected key starts descending (highest level / most actions /
  // most recent activity first), which is the most useful default view.
  function selectOrToggleSort(key: SortKey) {
    if (selectedSort === key) {
      onChange(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onChange(key, "desc");
    }
  }
</script>

<fieldset id="sort-panel" class="panel">
  <legend class="panel-title">Trier les utilisateurices</legend>
  <div class="sort" role="group" aria-label="Trier les utilisateurices">
    {#each SORT_OPTIONS as option}
      {@const active = selectedSort === option.key}
      <button
        type="button"
        class="fr-btn fr-btn--sm sort-button {active ? '' : 'fr-btn--tertiary'}"
        aria-pressed={active}
        title={active
          ? `Trié par ${option.label.toLowerCase()} — cliquer pour inverser le sens`
          : `Trier par ${option.label.toLowerCase()}`}
        onclick={() => selectOrToggleSort(option.key)}
      >
        {option.label}
        {#if active}
          <span
            class="sort-arrow {sortOrder === 'asc'
              ? 'fr-icon-arrow-up-line'
              : 'fr-icon-arrow-down-line'}"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
</fieldset>

<style lang="scss">
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }

  .panel {
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    padding: 1rem;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding: 0;
  }

  .sort {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;

    .sort-arrow {
      margin-left: 0.25rem;
    }

    .sort-arrow::before {
      --icon-size: 1rem;
    }
  }
</style>
