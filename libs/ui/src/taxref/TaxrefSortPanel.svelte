<script lang="ts">
  import { SORT_OPTIONS, type SortKey, type SortOrder } from "./taxrefList.ts";

  type Props = {
    selectedSort: SortKey;
    sortOrder: SortOrder;
    onChange: (sort: SortKey, order: SortOrder) => void;
  };

  let { selectedSort, sortOrder, onChange }: Props = $props();

  // Select the option, or flip the direction if it is already the active one
  function selectOrToggleSort(key: SortKey) {
    if (selectedSort === key) {
      onChange(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onChange(key, "asc");
    }
  }
</script>

<fieldset
  id="sort-panel-taxref"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Trier les taxons</legend>
  <div
    class="flex flex-row flex-wrap items-center gap-2"
    role="group"
    aria-label="Trier les taxons"
  >
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
            class="fr-ml-1v before:[--icon-size:1rem] {sortOrder === 'asc'
              ? 'fr-icon-arrow-up-line'
              : 'fr-icon-arrow-down-line'}"
            aria-hidden="true"
          ></span>
        {/if}
      </button>
    {/each}
  </div>
</fieldset>
