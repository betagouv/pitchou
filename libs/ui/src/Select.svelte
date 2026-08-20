<script lang="ts" generics="Value">
  import clsx from "clsx";

  import { commandForKey, createTypeahead } from "./Select/keyboard.ts";
  import {
    findByTypeahead,
    flattenOptions,
    toRenderedGroups,
    type SelectEntry,
    type SelectOption,
  } from "./Select/options.ts";
  import {
    computePlacement,
    type Placement,
    type PlacementPreferences,
  } from "./Select/placement.ts";
  import SelectListbox from "./Select/SelectListbox.svelte";
  import SelectTrigger from "./Select/SelectTrigger.svelte";

  type Props = {
    /** Identifies the trigger, so a `<label for>` can point at it. */
    id: string;
    options: SelectEntry<Value>[];
    value: Value;
    /** Shown when no option matches the current value. */
    placeholder?: string;
    disabled?: boolean;
    /** Makes the enclosing form refuse an empty value. */
    required?: boolean;
    /** Labels the trigger when no `<label for>` does. */
    ariaLabel?: string;
    /** Extra classes for the wrapper, e.g. a width. */
    class?: string;
    /** Asks for a taller and/or wider list, e.g. for long grouped option lists. */
    listPlacement?: PlacementPreferences;
    onChange?: (value: Value) => void;
  };

  let {
    id,
    options,
    value = $bindable(),
    placeholder = "Sélectionner une option",
    disabled = false,
    required = false,
    ariaLabel,
    class: className,
    listPlacement,
    onChange,
  }: Props = $props();

  const allOptions = $derived(flattenOptions(options));
  const groups = $derived(toRenderedGroups(options));
  const selected = $derived(allOptions.find((option) => option.value === value));

  let trigger = $state<HTMLButtonElement>();
  let root = $state<HTMLElement>();
  let open = $state(false);
  let activeIndex = $state(-1);
  let invalid = $state(false);
  let placement = $state<Placement>();

  function updatePlacement() {
    const rect = trigger?.getBoundingClientRect();
    if (rect)
      placement = computePlacement(rect, window.innerHeight, window.innerWidth, listPlacement);
  }

  // A page or panel scrolling under an open list moves the trigger, so the
  // placement is recomputed until the list closes.
  $effect(() => {
    if (!open) return;

    updatePlacement();
    const update = () => updatePlacement();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  });

  function openList() {
    if (disabled) return;
    updatePlacement();
    activeIndex = Math.max(
      0,
      allOptions.findIndex((option) => option.value === value),
    );
    open = true;
  }

  function closeList(restoreFocus = false) {
    open = false;
    activeIndex = -1;
    if (restoreFocus) trigger?.focus();
  }

  function select(option: SelectOption<Value>) {
    invalid = false;
    value = option.value;
    onChange?.(option.value);
    closeList(true);
  }

  function moveActive(index: number) {
    if (allOptions.length === 0) return;
    activeIndex = (index + allOptions.length) % allOptions.length;
  }

  // The active option follows the keyboard even when the list has to scroll.
  $effect(() => {
    if (open && activeIndex >= 0)
      document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  });

  const typeahead = createTypeahead();

  // Typing letters jumps to the matching option, closed list included.
  function jumpToTyped(key: string) {
    const from = open ? activeIndex : allOptions.findIndex((option) => option.value === value);
    const match = findByTypeahead(allOptions, typeahead.push(key), from);
    if (match === -1) return;

    if (open) activeIndex = match;
    else select(allOptions[match]);
  }

  function onKeydown(event: KeyboardEvent) {
    const command = commandForKey(event, { open, activeIndex, optionCount: allOptions.length });
    if (!command) return;
    if (!("keepEvent" in command)) event.preventDefault();

    switch (command.action) {
      case "open":
        return openList();
      case "close":
        return closeList();
      case "move":
        return moveActive(command.index);
      case "commit": {
        const option = allOptions[activeIndex];
        if (option) select(option);
        return;
      }
      case "type":
        return jumpToTyped(command.key);
    }
  }

  function onBodyPointerDown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) closeList();
  }

  export function focus() {
    trigger?.focus();
  }
</script>

<svelte:body onpointerdown={onBodyPointerDown} />

<div class={clsx("relative", className)} bind:this={root}>
  <SelectTrigger
    {id}
    {selected}
    {placeholder}
    {open}
    {disabled}
    {required}
    {activeIndex}
    {ariaLabel}
    {onKeydown}
    bind:element={trigger}
    bind:invalid
    onToggle={() => (open ? closeList() : openList())}
  />

  {#if open && placement}
    <SelectListbox
      {id}
      {groups}
      {value}
      {activeIndex}
      {placement}
      {ariaLabel}
      onSelect={select}
      onHover={(index) => (activeIndex = index)}
    />
  {/if}
</div>
