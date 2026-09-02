<script lang="ts">
  import {
    DOSSIER_SORT_OPTIONS,
    type DossierSortKey,
    type DossierSortOrder,
  } from "$lib/actions/adminDossierTypes.ts";

  type Props = {
    selectedSort: DossierSortKey;
    sortOrder: DossierSortOrder;
    onChange: (sort: DossierSortKey, order: DossierSortOrder) => void;
  };

  let { selectedSort, sortOrder, onChange }: Props = $props();

  // Select the option, or flip the direction if it is already the active one.
  function selectOrToggleSort(key: DossierSortKey) {
    if (selectedSort === key) {
      onChange(key, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onChange(key, key === "depot_date" ? "desc" : "asc");
    }
  }
</script>

<fieldset
  id="sort-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Trier les dossiers</legend>
  <div
    class="flex flex-row flex-wrap items-center gap-2"
    role="group"
    aria-label="Trier les dossiers"
  >
    {#each DOSSIER_SORT_OPTIONS as option (option.key)}
      {@const active = selectedSort === option.key}
      <button
        type="button"
        class="fr-btn fr-btn--sm {active ? '' : 'fr-btn--tertiary'}"
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
