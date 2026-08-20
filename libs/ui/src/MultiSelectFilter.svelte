<script lang="ts">
  import {
    flattenOptions,
    toRenderedGroups,
    type SelectEntry,
    type SelectOption,
  } from "./Select/options.ts";
  import SelectOptionMarker from "./Select/SelectOptionMarker.svelte";

  export type FilterOption = SelectOption<string>;

  type Props = {
    /** Used to build unique ids and as the aria-controls target */
    id: string;
    /** Filter name, e.g. « Phase » — labels the option group */
    label: string;
    /** Trigger text when nothing is selected, e.g. « Toutes les phases » */
    allLabel: string;
    /** Flat options, or groups of options (rendered under colored headers). */
    options: SelectEntry<string>[];
    selected: string[];
    onChange: (values: string[]) => void;
  };

  let { id, label, allLabel, options, selected, onChange }: Props = $props();

  let open = $state(false);
  let root: HTMLElement | undefined = $state();

  const allOptions = $derived(flattenOptions(options));
  const groups = $derived(toRenderedGroups(options));

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
      return allOptions.find((option) => option.value === selected[0])?.label ?? selected[0];
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
      class="absolute z-10 top-[calc(100%+0.25rem)] left-0 right-0 min-w-[16rem] max-h-[24rem] overflow-y-auto [padding:0.5rem_1rem_0.75rem] bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      id="{id}-options"
      role="group"
      aria-label={label}
    >
      <div class="flex gap-2 mb-1">
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          onclick={() => onChange(allOptions.map((option) => option.value))}
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
      <!-- Keyed on the position: two groups can share a label, and loose options
           only merge when consecutive, so labels are not unique. -->
      {#each groups as group, groupIndex (groupIndex)}
        <div role="group" aria-label={group.label ?? undefined}>
          {#if group.label}
            <p
              class="fr-text--bold flex items-center gap-2 pt-2 pb-1 m-0 text-[0.75rem] tracking-[0.03em] text-[color:var(--text-mention-grey)] uppercase"
            >
              {#if group.color}
                <span
                  class="h-3 w-3 flex-none rounded-full"
                  style:background-color={group.color}
                  aria-hidden="true"
                ></span>
              {/if}
              {group.label}
            </p>
          {/if}
          <ul class="list-none m-0 p-0">
            {#each group.options as { option } (option.value)}
              {@const checkboxId = `${id}-option-${option.value}`}
              <li>
                <div class="fr-checkbox-group fr-checkbox-group--sm">
                  <input
                    type="checkbox"
                    id={checkboxId}
                    checked={selected.includes(option.value)}
                    onchange={() => toggle(option.value)}
                  />
                  <label class="fr-label" for={checkboxId}>
                    {#if option.icon || option.color}
                      <!-- Top-aligned: the marker is one line-height tall, so it stays level
                           with the first text line (and the checkbox) when the label wraps. -->
                      <span class="inline-flex items-start gap-2">
                        <SelectOptionMarker color={option.color} icon={option.icon} />
                        <span>{option.label}</span>
                      </span>
                    {:else}
                      {option.label}
                    {/if}
                  </label>
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>
