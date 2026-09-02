<script lang="ts" generics="Value">
  import clsx from "clsx";

  import type { RenderedGroup, SelectOption } from "./options.ts";
  import type { Placement } from "./placement.ts";
  import SelectOptionMarker from "./SelectOptionMarker.svelte";

  type Props = {
    /** The trigger's id: options and the listbox derive theirs from it. */
    id: string;
    groups: RenderedGroup<Value>[];
    value: Value;
    /** Position among all options of the option the keyboard sits on. */
    activeIndex: number;
    placement: Placement;
    ariaLabel?: string;
    onSelect: (option: SelectOption<Value>) => void;
    onHover: (index: number) => void;
  };

  let { id, groups, value, activeIndex, placement, ariaLabel, onSelect, onHover }: Props = $props();
</script>

<div
  id="{id}-listbox"
  role="listbox"
  aria-label={ariaLabel}
  tabindex="-1"
  class="fr-p-1v fixed z-[2000] min-w-[12rem] overflow-y-auto overscroll-contain rounded-[0.25rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] shadow-[0_4px_16px_rgba(0,0,18,0.16)]"
  style:left="{placement.left}px"
  style:width="{placement.width}px"
  style:max-height="{placement.maxHeight}px"
  style:top={placement.top === undefined ? undefined : `${placement.top}px`}
  style:bottom={placement.bottom === undefined ? undefined : `${placement.bottom}px`}
>
  <!-- Keyed on the position: two groups can share a label, and loose options
       only merge when consecutive, so labels are not unique. -->
  {#each groups as group, groupIndex (groupIndex)}
    <div role="group" aria-label={group.label ?? undefined}>
      {#if group.label}
        <p
          class="fr-px-1w fr-pt-1w fr-pb-1v fr-m-0 fr-text--bold flex items-center gap-2 text-[0.75rem] tracking-[0.03em] text-[color:var(--text-mention-grey)] uppercase"
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

      {#each group.options as { option, index } (index)}
        {@const isSelected = option.value === value}
        <!-- Keyboard handling belongs to the trigger, which keeps the focus
             and points here through aria-activedescendant. -->
        <button
          id="{id}-option-{index}"
          type="button"
          role="option"
          tabindex="-1"
          aria-selected={isSelected}
          class={clsx(
            "fr-px-1w fr-py-1v flex w-full cursor-pointer items-start gap-2 rounded-[0.25rem] text-left",
            activeIndex === index && "bg-[var(--background-alt-grey)]",
            isSelected && "fr-text--bold text-[color:var(--text-active-blue-france)]",
          )}
          onclick={() => onSelect(option)}
          onmousemove={() => onHover(index)}
        >
          <span
            class={clsx("fr-icon-check-line fr-icon--sm flex-none", !isSelected && "invisible")}
            aria-hidden="true"
          ></span>
          <SelectOptionMarker color={option.color} icon={option.icon} />
          <span class="min-w-0 grow">
            {option.label}
            {#if option.hint}
              <span
                class="fr-text--regular block text-[0.75rem] text-[color:var(--text-mention-grey)]"
              >
                {option.hint}
              </span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  {/each}
</div>
