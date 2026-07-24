<script lang="ts">
  import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday,
    isValid,
    parse,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
  } from "date-fns";
  import { fr } from "date-fns/locale";

  type Props = {
    id: string;
    label: string;
    value: string;
    min?: string;
    max?: string;
    align?: "left" | "right";
    onChange: (value: string | null) => void;
  };

  let { id, label, value, min, max, align = "left", onChange }: Props = $props();

  const ISO = "yyyy-MM-dd";
  const DISPLAY = "dd/MM/yyyy";
  const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

  let open = $state(false);
  let openAbove = $state(false);
  let root: HTMLElement | undefined = $state();
  let viewMonth = $state(startOfMonth(new Date()));
  let inputValue = $state("");

  const selectedDate = $derived(value ? parseISO(value) : undefined);
  const minDate = $derived(min ? parseISO(min) : undefined);
  const maxDate = $derived(max ? parseISO(max) : undefined);
  const monthLabel = $derived(format(viewMonth, "LLLL yyyy", { locale: fr }));
  const days = $derived(
    eachDayOfInterval({
      start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
    }),
  );
  const inputDate = $derived(parseInputDate(inputValue));
  const inputInvalid = $derived(inputValue.length === 10 && !inputDate);

  $effect(() => {
    inputValue = selectedDate ? format(selectedDate, DISPLAY) : "";
  });

  const isDisabled = (day: Date) =>
    (minDate && isBefore(day, minDate)) || (maxDate && isAfter(day, maxDate));

  function parseInputDate(input: string) {
    const date = parse(input, DISPLAY, new Date());
    return isValid(date) && format(date, DISPLAY) === input && !isDisabled(date) ? date : undefined;
  }

  function formatInputDate(input: string) {
    const digits = input.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function openPanel() {
    viewMonth = startOfMonth(selectedDate ?? new Date());
    if (root) {
      const rect = root.getBoundingClientRect();
      const estimatedPanelHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      openAbove = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow;
    }
    open = true;
  }

  function select(day: Date) {
    if (isDisabled(day)) return;
    onChange(format(day, ISO));
    open = false;
  }

  function typeDate(event: Event & { currentTarget: HTMLInputElement }) {
    inputValue = formatInputDate(event.currentTarget.value);
    event.currentTarget.value = inputValue;

    if (!inputValue) {
      onChange(null);
      return;
    }

    if (inputDate) {
      onChange(format(inputDate, ISO));
    }
  }

  function resetInvalidInput() {
    if (inputValue && !inputDate) {
      inputValue = selectedDate ? format(selectedDate, DISPLAY) : "";
    }
  }

  function confirmDate(event: KeyboardEvent) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    event.stopPropagation();

    if (inputDate) {
      onChange(format(inputDate, ISO));
      open = false;
    } else {
      resetInvalidInput();
    }
  }

  function onBodyClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="relative flex-[1_1_auto] min-w-0" bind:this={root}>
  <div
    class="fr-select relative min-h-[2.5rem] fr-icon-calendar-line fr-btn--icon-left before:relative before:z-[2] before:pointer-events-none focus-within:[outline:2px_solid_var(--border-active-blue-france)] focus-within:[outline-offset:2px]"
    class:fr-select--error={inputInvalid}
  >
    <input
      {id}
      type="text"
      class="absolute z-[1] inset-0 w-full h-full fr-pr-6w fr-pl-5w border-0 outline-0 bg-transparent text-inherit [font:inherit]"
      aria-label={label}
      aria-haspopup="dialog"
      aria-controls="{id}-panel"
      aria-invalid={inputInvalid}
      autocomplete="off"
      data-form-type="other"
      inputmode="numeric"
      maxlength="10"
      placeholder="jj/mm/aaaa"
      value={inputValue}
      onblur={resetInvalidInput}
      onclick={() => !open && openPanel()}
      oninput={typeDate}
      onkeydown={confirmDate}
    />
  </div>

  {#if open}
    <div
      class="absolute z-[1000] top-[calc(100%+0.25rem)] left-0 w-[18rem] max-w-[calc(100vw-2rem)] fr-p-3v bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))] [&.open-above]:top-auto [&.open-above]:bottom-[calc(100%+0.25rem)] [&.align-right]:right-0 [&.align-right]:left-auto"
      class:open-above={openAbove}
      class:align-right={align === "right"}
      id="{id}-panel"
      role="dialog"
      aria-label={label}
    >
      <div class="flex items-center justify-between fr-mb-1w">
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-s-line"
          aria-label="Mois précédent"
          onclick={() => (viewMonth = subMonths(viewMonth, 1))}
        ></button>
        <span class="fr-text--bold capitalize" aria-live="polite">{monthLabel}</span>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-right-s-line"
          aria-label="Mois suivant"
          onclick={() => (viewMonth = addMonths(viewMonth, 1))}
        ></button>
      </div>

      <div class="grid grid-cols-7 gap-[0.125rem]" role="grid">
        {#each WEEKDAYS as weekday, index (index)}
          <span
            class="flex items-center justify-center h-8 text-[0.75rem] fr-text--bold text-[color:var(--text-mention-grey)]"
            role="columnheader"
            aria-hidden="true">{weekday}</span
          >
        {/each}
        {#each days as day (day.getTime())}
          {@const outside = !isSameMonth(day, viewMonth)}
          {@const selected = selectedDate && isSameDay(day, selectedDate)}
          <button
            type="button"
            class="flex items-center justify-center h-8 border-0 rounded-[0.25rem] bg-transparent text-[color:var(--text-default-grey)] text-[0.875rem] cursor-pointer enabled:hover:bg-[var(--background-alt-grey-hover,rgba(0,0,0,0.06))] [&.outside]:text-[color:var(--text-disabled-grey)] [&.today]:shadow-[inset_0_0_0_1px_var(--border-active-blue-france)] [&.selected]:bg-[var(--background-action-high-blue-france)] [&.selected]:text-[color:var(--text-inverted-blue-france)] disabled:text-[color:var(--text-disabled-grey)] disabled:cursor-not-allowed"
            class:outside
            class:selected
            class:today={isToday(day)}
            disabled={isDisabled(day)}
            aria-pressed={selected}
            aria-label={format(day, "EEEE d MMMM yyyy", { locale: fr })}
            onclick={() => select(day)}
          >
            {day.getDate()}
          </button>
        {/each}
      </div>

      {#if selectedDate}
        <div class="flex justify-end fr-mt-1w">
          <button
            type="button"
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
            onclick={() => {
              onChange(null);
              open = false;
            }}
          >
            Effacer
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
