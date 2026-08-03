<script lang="ts">
  import { tick } from "svelte";

  import { filterSearchableOptions, type SearchableOption } from "./searchableSelect.ts";
  import SearchableSelectOptions from "./SearchableSelectOptions.svelte";

  type Props = {
    id: string;
    labelledBy: string;
    options: SearchableOption[];
    value: string;
    placeholder?: string;
    required?: boolean;
    onChange: (value: string) => void;
  };

  let {
    id,
    labelledBy,
    options,
    value,
    placeholder = "Sélectionnez ou commencez à saisir",
    required = false,
    onChange,
  }: Props = $props();

  let root = $state<HTMLElement>();
  let trigger = $state<HTMLButtonElement>();
  let searchInput = $state<HTMLInputElement>();
  let open = $state(false);
  let query = $state("");
  let activeIndex = $state(0);
  let invalid = $state(false);

  const filteredOptions = $derived(filterSearchableOptions(options, query));
  const selectedLabel = $derived(options.find((option) => option.value === value)?.label ?? "");

  async function openList() {
    open = true;
    query = "";
    activeIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    );
    await tick();
    searchInput?.focus();
  }

  function closeList(restoreFocus = false) {
    open = false;
    query = "";
    if (restoreFocus) trigger?.focus();
  }

  function selectOption(option: SearchableOption) {
    invalid = false;
    onChange(option.value);
    closeList(true);
  }

  function onBodyPointerDown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) closeList();
  }

  function onFocusOut(event: FocusEvent) {
    if (open && root && !root.contains(event.relatedTarget as Node | null)) closeList();
  }

  function onTriggerKeydown(event: KeyboardEvent) {
    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openList();
    }
  }

  function onSearchInput() {
    activeIndex = 0;
  }

  function moveActiveOption(index: number) {
    if (filteredOptions.length === 0) return;
    activeIndex = Math.max(0, Math.min(index, filteredOptions.length - 1));
  }

  function onSearchKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeList(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveOption(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveOption(activeIndex - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]);
    }
  }

  function onInvalid(event: Event) {
    event.preventDefault();
    invalid = true;
    openList();
  }
</script>

<svelte:body onpointerdown={onBodyPointerDown} />

<div class="relative" bind:this={root} onfocusout={onFocusOut}>
  <select
    class="absolute w-px h-px opacity-0 pointer-events-none"
    tabindex="-1"
    aria-hidden="true"
    {required}
    {value}
    oninvalid={onInvalid}
  >
    <option value=""></option>
    {#each options as option (option.value)}<option value={option.value}>{option.label}</option
      >{/each}
  </select>

  <button
    type="button"
    class={`fr-select w-full text-left cursor-pointer ${selectedLabel ? "" : "text-[color:var(--text-mention-grey)]"}`}
    {id}
    bind:this={trigger}
    role="combobox"
    aria-labelledby={`${labelledBy} ${id}-value`}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={`${id}-options`}
    aria-required={required}
    aria-invalid={invalid}
    aria-describedby={invalid ? `${id}-error` : undefined}
    onclick={() => (open ? closeList() : openList())}
    onkeydown={onTriggerKeydown}
  >
    <span id={`${id}-value`}>{selectedLabel || placeholder}</span>
  </button>

  {#if open}
    <div
      class="absolute z-20 left-0 right-0 top-[calc(100%+0.25rem)] bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
    >
      <div class="relative border-b border-[color:var(--border-default-grey)]">
        <span
          class="fr-icon-search-line absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-default-grey)]"
          aria-hidden="true"
        ></span>
        <input
          class="fr-input w-full pl-12"
          id={`${id}-search`}
          type="search"
          autocomplete="off"
          aria-labelledby={labelledBy}
          aria-controls={`${id}-options`}
          aria-required={required}
          aria-activedescendant={filteredOptions[activeIndex]
            ? `${id}-option-${activeIndex}`
            : undefined}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          bind:this={searchInput}
          bind:value={query}
          oninput={onSearchInput}
          onkeydown={onSearchKeydown}
        />
      </div>

      <SearchableSelectOptions
        {id}
        {labelledBy}
        options={filteredOptions}
        {value}
        {activeIndex}
        onActivate={(index) => (activeIndex = index)}
        onSelect={selectOption}
      />
    </div>
  {/if}
  {#if invalid}<p class="fr-error-text" id={`${id}-error`} role="alert">
      Veuillez sélectionner une option.
    </p>{/if}
</div>
