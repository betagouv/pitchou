<script lang="ts" generics="Value">
  import clsx from "clsx";

  import type { SelectOption } from "./options.ts";
  import SelectOptionMarker from "./SelectOptionMarker.svelte";

  type Props = {
    /** Identifies the trigger, so a `<label for>` can point at it. */
    id: string;
    /** The button itself, which the owner focuses and measures. */
    element?: HTMLButtonElement;
    selected: SelectOption<Value> | undefined;
    placeholder: string;
    open: boolean;
    disabled: boolean;
    required: boolean;
    /** Set when the enclosing form was submitted with nothing selected. */
    invalid: boolean;
    /** Position among all options of the option the keyboard sits on. */
    activeIndex: number;
    ariaLabel?: string;
    onToggle: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  };

  let {
    id,
    element = $bindable(),
    selected,
    placeholder,
    open,
    disabled,
    required,
    invalid = $bindable(),
    activeIndex,
    ariaLabel,
    onToggle,
    onKeydown,
  }: Props = $props();

  function reportInvalid(event: Event) {
    event.preventDefault();
    invalid = true;
    element?.focus();
  }
</script>

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
    oninvalid={reportInvalid}
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
  bind:this={element}
  onclick={onToggle}
  onkeydown={onKeydown}
>
  <span class="flex min-w-0 items-center gap-2">
    {#if selected}
      <SelectOptionMarker color={selected.color} icon={selected.icon} />
    {/if}
    <span class={clsx("truncate", !selected && "text-[color:var(--text-mention-grey)]")}>
      {selected?.label ?? placeholder}
    </span>
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
