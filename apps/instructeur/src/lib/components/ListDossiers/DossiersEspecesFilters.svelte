<script lang="ts">
  import {
    CLASSIFICATION_OPTIONS,
    INSTANCE_OPTIONS,
    STATUT_OPTIONS,
    type EspecesFilters,
  } from "./especesFilterOptions.ts";

  type Props = { id: string; filters: EspecesFilters };
  let { id, filters = $bindable() }: Props = $props();
</script>

<div {id} class="flex flex-col fr-mb-2w gap-3">
  <!-- « Type d'espèce »: toggles rather than checkboxes, to get the tiles of the maquette while
       keeping the pressed state announced. Same idiom as the quick filters of the toolbar. -->
  <fieldset class="border-0 fr-m-0 fr-p-0">
    <legend class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w fr-p-0">
      <span aria-hidden="true">🗂️</span> Type d'espèce
    </legend>
    <div class="grid grid-cols-3 gap-2">
      {#each CLASSIFICATION_OPTIONS as option (option.value)}
        {@const selected = filters.classifications.includes(option.value)}
        <button
          type="button"
          class="flex flex-col items-center justify-center gap-1 fr-py-2w fr-px-1w text-center cursor-pointer bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] [&.active]:shadow-[inset_0_0_0_2px_var(--border-active-blue-france,#000091)]"
          class:active={selected}
          aria-pressed={selected}
          onclick={() =>
            (filters.classifications = selected
              ? filters.classifications.filter((value) => value !== option.value)
              : [...filters.classifications, option.value])}
        >
          <span class="text-[1.25rem]" aria-hidden="true">{option.emoji}</span>
          <span>{option.label}</span>
        </button>
      {/each}
    </div>
  </fieldset>

  <fieldset class="border-0 fr-m-0 fr-p-0">
    <legend class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w fr-p-0">
      <span aria-hidden="true">☂️</span> Statut de protection
    </legend>
    {#each STATUT_OPTIONS as option (option.value)}
      <div class="fr-checkbox-group fr-checkbox-group--sm">
        <input
          type="checkbox"
          id="{id}-statut-{option.value}"
          value={option.value}
          bind:group={filters.statuts}
        />
        <label class="fr-label" for="{id}-statut-{option.value}">{option.label}</label>
      </div>
    {/each}
  </fieldset>

  <fieldset class="border-0 fr-m-0 fr-p-0">
    <legend class="flex items-center gap-2 text-[1rem] fr-text--bold fr-mb-1w fr-p-0">
      <span aria-hidden="true">🏛️</span> Instance consultative
    </legend>
    {#each INSTANCE_OPTIONS as option (option.value)}
      <div class="fr-checkbox-group fr-checkbox-group--sm">
        <input
          type="checkbox"
          id="{id}-instance-{option.value}"
          value={option.value}
          bind:group={filters.instances}
        />
        <label class="fr-label" for="{id}-instance-{option.value}">{option.label}</label>
      </div>
    {/each}
  </fieldset>
</div>

<hr class="fr-pb-1v" />
