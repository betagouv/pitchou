<script lang="ts">
  export type FilterOption = { value: string; label: string };

  type Props = {
    /** Used to build unique ids and as the aria-controls target */
    id: string;
    /** Filter name, e.g. « Phase » — labels the option group */
    label: string;
    /** Trigger text when nothing is selected, e.g. « Toutes les phases » */
    allLabel: string;
    options: FilterOption[];
    selected: string[];
    onChange: (values: string[]) => void;
  };

  let { id, label, allLabel, options, selected, onChange }: Props = $props();

  let open = $state(false);
  let root: HTMLElement | undefined = $state();

  // Close when clicking anywhere outside the dropdown (selecting options keeps it open).
  function onBodyClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const summary = $derived.by(() => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1)
      return options.find((option) => option.value === selected[0])?.label ?? selected[0];
    return `${selected.length} sélectionné·es`;
  });
</script>

<svelte:body onclick={onBodyClick} />

<div class="multiselect" bind:this={root}>
  <button
    type="button"
    class="fr-select multiselect-trigger"
    class:placeholder={selected.length === 0}
    aria-haspopup="true"
    aria-expanded={open}
    aria-controls="{id}-options"
    onclick={() => (open = !open)}
  >
    {summary}
  </button>

  {#if open}
    <div class="multiselect-panel" id="{id}-options" role="group" aria-label={label}>
      <div class="multiselect-actions">
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          onclick={() => onChange(options.map((option) => option.value))}
        >
          Tout
        </button>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          onclick={() => onChange([])}
        >
          Aucun
        </button>
      </div>
      <ul class="multiselect-list">
        {#each options as option (option.value)}
          {@const checkboxId = `${id}-option-${option.value}`}
          <li>
            <div class="fr-checkbox-group fr-checkbox-group--sm">
              <input
                type="checkbox"
                id={checkboxId}
                checked={selected.includes(option.value)}
                onchange={() => toggle(option.value)}
              />
              <label class="fr-label" for={checkboxId}>{option.label}</label>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style lang="scss">
  .multiselect {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }

  // Reuse the DSFR select look (border + caret) on a button, left-aligned and truncating.
  .multiselect-trigger {
    width: 100%;
    text-align: left;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: pointer;

    &.placeholder {
      color: var(--text-mention-grey);
    }
  }

  .multiselect-panel {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    left: 0;
    right: 0;
    min-width: 16rem;
    max-height: 18rem;
    overflow-y: auto;
    padding: 0.5rem 1rem 0.75rem;
    background-color: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    box-shadow: var(--overlap-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));
  }

  .multiselect-actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .multiselect-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
