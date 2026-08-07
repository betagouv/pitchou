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

<div class="relative flex-[1_1_auto] min-w-0" bind:this={root}>
  <button
    {id}
    type="button"
    class="fr-select w-full text-left truncate cursor-pointer [&.placeholder]:text-[color:var(--text-mention-grey)]"
    class:placeholder={selected.length === 0}
    aria-haspopup="true"
    aria-expanded={open}
    aria-controls="{id}-options"
    onclick={() => (open = !open)}
  >
    {summary}
  </button>

  {#if open}
    <div
      class="absolute z-10 top-[calc(100%+0.25rem)] left-0 right-0 min-w-[16rem] max-h-[18rem] overflow-y-auto [padding:0.5rem_1rem_0.75rem] bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      id="{id}-options"
      role="group"
      aria-label={label}
    >
      <div class="flex gap-2 mb-1">
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
      <ul class="list-none m-0 p-0">
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
