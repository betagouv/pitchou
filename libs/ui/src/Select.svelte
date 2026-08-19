<script lang="ts" generics="Value">
  import clsx from "clsx";

  import {
    findByTypeahead,
    flattenOptions,
    toRenderedGroups,
    type SelectEntry,
    type SelectOption,
  } from "./Select/options.ts";

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
    onChange,
  }: Props = $props();

  const allOptions = $derived(flattenOptions(options));
  const groups = $derived(toRenderedGroups(options));
  const selected = $derived(allOptions.find((option) => option.value === value));

  let trigger = $state<HTMLButtonElement>();
  let root = $state<HTMLElement>();
  let open = $state(false);
  let activeIndex = $state(-1);

  /** Room the list asks for before it starts scrolling. */
  const PREFERRED_HEIGHT = 288;
  /** Below that, opening on a side is not worth it — the other side wins. */
  const MIN_HEIGHT = 144;
  /** Space between the trigger and the list. */
  const GAP = 4;
  /** Breathing room kept against the viewport edges. */
  const VIEWPORT_MARGIN = 8;

  type Placement = {
    left: number;
    width: number;
    maxHeight: number;
    /** Only one is set: the side the list grows from. */
    top?: number;
    bottom?: number;
  };

  let placement = $state<Placement>();

  /**
   * The list is positioned against the viewport rather than the trigger, so
   * neither a scrolling panel nor a modal can clip it. It opens downwards when
   * there is room, upwards otherwise, and shrinks to whatever space is left.
   */
  function updatePlacement() {
    const rect = trigger?.getBoundingClientRect();
    if (!rect) return;

    const below = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const above = rect.top - GAP - VIEWPORT_MARGIN;
    const dropUp = below < Math.min(PREFERRED_HEIGHT, above) && above > MIN_HEIGHT;
    const available = dropUp ? above : below;

    placement = {
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(MIN_HEIGHT, Math.min(PREFERRED_HEIGHT, available)),
      top: dropUp ? undefined : rect.bottom + GAP,
      bottom: dropUp ? window.innerHeight - rect.top + GAP : undefined,
    };
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

  let invalid = $state(false);

  function onInvalid(event: Event) {
    event.preventDefault();
    invalid = true;
    trigger?.focus();
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

  let typeahead = "";
  let typeaheadTimeout: ReturnType<typeof setTimeout> | undefined;

  // Typing letters jumps to the matching option, closed list included, like a
  // native `<select>`. The query resets once typing stops.
  function onTypeahead(key: string) {
    clearTimeout(typeaheadTimeout);
    typeahead += key;
    typeaheadTimeout = setTimeout(() => (typeahead = ""), 700);

    const from = open ? activeIndex : allOptions.findIndex((option) => option.value === value);
    const match = findByTypeahead(allOptions, typeahead, from);
    if (match === -1) return;

    if (open) activeIndex = match;
    else select(allOptions[match]);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Tab") {
      if (open) closeList();
      return;
    }

    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        closeList();
      }
      return;
    }

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
        return;
      }
    } else {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          return moveActive(activeIndex + 1);
        case "ArrowUp":
          event.preventDefault();
          return moveActive(activeIndex - 1);
        case "Home":
          event.preventDefault();
          return moveActive(0);
        case "End":
          event.preventDefault();
          return moveActive(allOptions.length - 1);
        case "Enter":
        case " ": {
          event.preventDefault();
          const option = allOptions[activeIndex];
          if (option) select(option);
          return;
        }
      }
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      onTypeahead(event.key);
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
  <!-- Native validation has no hold on a button, so a mirror select carries the
       requirement for the enclosing form. Its own bubble would point at nothing
       visible, so the message is rendered under the trigger instead. -->
  {#if required}
    <select
      class="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      tabindex="-1"
      aria-hidden="true"
      required
      value={selected && selected.value !== "" ? "chosen" : ""}
      oninvalid={onInvalid}
    >
      <option value=""></option>
      <option value="chosen"></option>
    </select>
  {/if}

  <button
    {id}
    {disabled}
    type="button"
    role="combobox"
    aria-label={ariaLabel}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="{id}-listbox"
    aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
    aria-required={required || undefined}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid ? `${id}-error` : undefined}
    class={clsx(
      "fr-px-2w fr-py-1w flex w-full cursor-pointer items-center justify-between gap-2 rounded-t-[0.25rem] bg-[var(--background-contrast-grey)] text-left",
      "enabled:hover:bg-[var(--background-contrast-grey-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a76f6]",
      // Matches how DSFR greys out a disabled `.fr-select`, including when an
      // ancestor fieldset is the one doing the disabling.
      "disabled:cursor-not-allowed disabled:text-[color:var(--text-disabled-grey)] disabled:shadow-[inset_0_-2px_0_0_var(--border-disabled-grey)]",
      open
        ? "shadow-[inset_0_-2px_0_0_var(--background-action-high-blue-france)]"
        : "shadow-[inset_0_-2px_0_0_var(--border-plain-grey)]",
    )}
    bind:this={trigger}
    onclick={() => (open ? closeList() : openList())}
    onkeydown={onKeydown}
  >
    <span class={clsx("truncate", !selected && "text-[color:var(--text-mention-grey)]")}>
      {selected?.label ?? placeholder}
    </span>
    <span
      class={clsx(
        "fr-icon-arrow-down-s-line fr-icon--sm flex-none transition-transform duration-150",
        open && "rotate-180",
      )}
      aria-hidden="true"
    ></span>
  </button>

  {#if invalid}
    <p class="fr-error-text" id="{id}-error" role="alert">Veuillez sélectionner une option.</p>
  {/if}

  {#if open && placement}
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
      {#each groups as group (group.label ?? "")}
        <div role="group" aria-label={group.label ?? undefined}>
          {#if group.label}
            <p
              class="fr-px-1w fr-pt-1w fr-pb-1v fr-m-0 fr-text--bold text-[0.75rem] tracking-[0.03em] text-[color:var(--text-mention-grey)] uppercase"
            >
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
              onclick={() => select(option)}
              onmousemove={() => (activeIndex = index)}
            >
              <span
                class={clsx("fr-icon-check-line fr-icon--sm flex-none", !isSelected && "invisible")}
                aria-hidden="true"
              ></span>
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
  {/if}
</div>
