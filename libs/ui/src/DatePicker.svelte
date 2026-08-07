<script lang="ts">
  import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
  import { fr } from "date-fns/locale";
  import {
    DATE_DISPLAY_FORMAT,
    DATE_ISO_FORMAT,
    formatInputDate,
    getCalendarDays,
    isDateDisabled,
    parseInputDate,
  } from "./DatePicker/calendarInput.ts";
  import DatePickerCalendar from "./DatePicker/DatePickerCalendar.svelte";

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

  let open = $state(false);
  let openAbove = $state(false);
  let root: HTMLElement | undefined = $state();
  let viewMonth = $state(startOfMonth(new Date()));
  let inputValue = $state("");

  const selectedDate = $derived(value ? parseISO(value) : undefined);
  const minDate = $derived(min ? parseISO(min) : undefined);
  const maxDate = $derived(max ? parseISO(max) : undefined);
  const monthLabel = $derived(format(viewMonth, "LLLL yyyy", { locale: fr }));
  const days = $derived(getCalendarDays(viewMonth));
  const inputDate = $derived(parseInputDate(inputValue, minDate, maxDate));
  const inputInvalid = $derived(inputValue.length === 10 && !inputDate);

  $effect(() => {
    inputValue = selectedDate ? format(selectedDate, DATE_DISPLAY_FORMAT) : "";
  });

  const isDisabled = (day: Date) => isDateDisabled(day, minDate, maxDate);

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
    onChange(format(day, DATE_ISO_FORMAT));
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
      onChange(format(inputDate, DATE_ISO_FORMAT));
    }
  }

  function resetInvalidInput() {
    if (inputValue && !inputDate) {
      inputValue = selectedDate ? format(selectedDate, DATE_DISPLAY_FORMAT) : "";
    }
  }

  function confirmDate(event: KeyboardEvent) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    event.stopPropagation();

    if (inputDate) {
      onChange(format(inputDate, DATE_ISO_FORMAT));
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
    <DatePickerCalendar
      {id}
      {label}
      {align}
      {openAbove}
      {viewMonth}
      {monthLabel}
      {days}
      {selectedDate}
      {isDisabled}
      onPreviousMonth={() => (viewMonth = subMonths(viewMonth, 1))}
      onNextMonth={() => (viewMonth = addMonths(viewMonth, 1))}
      onSelect={select}
      onClear={() => {
        onChange(null);
        open = false;
      }}
    />
  {/if}
</div>
