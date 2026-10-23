<script lang="ts">
  import { tick } from "svelte";
  import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
  import { fr } from "date-fns/locale";
  import {
    formatInputDate,
    getCalendarDays,
    parseInputDate,
  } from "@pitchou/ui/DatePicker/calendarInput.ts";
  import DatePickerCalendar from "@pitchou/ui/DatePicker/DatePickerCalendar.svelte";
  let {
    id,
    name,
    label,
    value,
    onChange,
    align = "left",
  }: {
    id: string;
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    align?: "left" | "right";
  } = $props();
  let root = $state<HTMLElement>();
  let input = $state<HTMLInputElement>();
  let open = $state(false);
  let openAbove = $state(false);
  let text = $state("");
  let month = $state(startOfMonth(new Date()));
  const selected = $derived(value ? parseISO(value) : undefined);
  const valid = $derived(!text || !!parseInputDate(text));
  $effect(() => {
    text = selected ? format(selected, "dd/MM/yyyy") : "";
    input?.setCustomValidity("");
  });
  function show() {
    month = startOfMonth(selected ?? new Date());
    const rect = root?.getBoundingClientRect();
    openAbove =
      !!rect &&
      window.innerHeight - rect.bottom < 340 &&
      rect.top > window.innerHeight - rect.bottom;
    open = true;
  }
  function close() {
    open = false;
    input?.focus();
  }
  function change(day?: Date) {
    onChange(day ? format(day, "yyyy-MM-dd") : "");
    close();
  }
  function type(event: Event & { currentTarget: HTMLInputElement }) {
    text = formatInputDate(event.currentTarget.value);
    event.currentTarget.value = text;
    const parsed = parseInputDate(text);
    event.currentTarget.setCustomValidity(
      !text || parsed ? "" : "Saisissez une date au format jj/mm/aaaa.",
    );
    if (parsed || !text) onChange(parsed ? format(parsed, "yyyy-MM-dd") : "");
  }
  async function keyboard(event: KeyboardEvent) {
    if (!open || !root?.contains(document.activeElement)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown" && document.activeElement === input) {
      event.preventDefault();
      await tick();
      (
        root.querySelector<HTMLButtonElement>('[role="grid"] button[aria-pressed="true"]') ??
        root.querySelector<HTMLButtonElement>('[role="grid"] button')
      )?.focus();
      return;
    }
    const days = [...root.querySelectorAll<HTMLButtonElement>('[role="grid"] button')];
    const index = days.indexOf(document.activeElement as HTMLButtonElement);
    const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key];
    if (index >= 0 && offset) {
      event.preventDefault();
      days[Math.max(0, Math.min(days.length - 1, index + offset))]?.focus();
    }
  }
  $effect(() => {
    const closeOnFocusOutside = (event: FocusEvent) => {
      if (open && !root?.contains(event.target as Node)) open = false;
    };
    document.addEventListener("focusin", closeOnFocusOutside);
    return () => document.removeEventListener("focusin", closeOnFocusOutside);
  });
  function outside(event: PointerEvent) {
    if (!root?.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window onkeydown={keyboard} onpointerdown={outside} />
<div class="notification-date" bind:this={root}>
  <div class="date-input">
    <label for={id}>{label}</label>
    <input
      {id}
      bind:this={input}
      value={text}
      oninput={type}
      inputmode="numeric"
      maxlength="10"
      autocomplete="off"
      placeholder="jj/mm/aaaa"
      aria-invalid={!valid}
      aria-label={`${label}, heure de Paris`}
      aria-describedby={!valid ? `${id}-error` : undefined}
      onblur={() => {
        input?.setCustomValidity(valid ? "" : "Saisissez une date au format jj/mm/aaaa.");
      }}
    />
    <button
      type="button"
      aria-label={`Calendrier ${label.toLowerCase()}`}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      onclick={() => {
        if (open) close();
        else show();
      }}><span class="fr-icon-calendar-line fr-icon--sm" aria-hidden="true"></span></button
    >
  </div>
  <input type="hidden" {name} {value} />
  {#if !valid}<span id={`${id}-error`} class="date-error">Date attendue : jj/mm/aaaa</span>{/if}
  {#if open}<DatePickerCalendar
      {id}
      label={`Calendrier ${label.toLowerCase()}`}
      {align}
      {openAbove}
      viewMonth={month}
      monthLabel={format(month, "LLLL yyyy", { locale: fr })}
      days={getCalendarDays(month)}
      selectedDate={selected}
      isDisabled={() => false}
      onPreviousMonth={() => {
        month = subMonths(month, 1);
      }}
      onNextMonth={() => {
        month = addMonths(month, 1);
      }}
      onSelect={change}
      onClear={() => change()}
    />{/if}
</div>
