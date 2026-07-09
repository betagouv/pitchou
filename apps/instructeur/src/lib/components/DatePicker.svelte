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
    onChange: (value: string | null) => void;
  };

  let { id, label, value, min, max, onChange }: Props = $props();

  const ISO = "yyyy-MM-dd";
  const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

  let open = $state(false);
  let openAbove = $state(false);
  let root: HTMLElement | undefined = $state();
  let viewMonth = $state(startOfMonth(new Date()));

  const selectedDate = $derived(value ? parseISO(value) : undefined);
  const minDate = $derived(min ? parseISO(min) : undefined);
  const maxDate = $derived(max ? parseISO(max) : undefined);
  const triggerLabel = $derived(selectedDate ? format(selectedDate, "dd/MM/yyyy") : "jj/mm/aaaa");
  const monthLabel = $derived(format(viewMonth, "LLLL yyyy", { locale: fr }));
  const days = $derived(
    eachDayOfInterval({
      start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
    }),
  );

  const isDisabled = (day: Date) =>
    (minDate && isBefore(day, minDate)) || (maxDate && isAfter(day, maxDate));

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

  function onBodyClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="datepicker" bind:this={root}>
  <button
    type="button"
    class="fr-select datepicker-trigger fr-icon-calendar-line fr-btn--icon-left"
    class:placeholder={!selectedDate}
    aria-haspopup="dialog"
    aria-expanded={open}
    aria-controls="{id}-panel"
    aria-label="{label} : {triggerLabel}"
    onclick={() => (open ? (open = false) : openPanel())}
  >
    {triggerLabel}
  </button>

  {#if open}
    <div
      class="datepicker-panel"
      class:open-above={openAbove}
      id="{id}-panel"
      role="dialog"
      aria-label={label}
    >
      <div class="datepicker-header">
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-s-line"
          aria-label="Mois précédent"
          onclick={() => (viewMonth = subMonths(viewMonth, 1))}
        ></button>
        <span class="datepicker-month" aria-live="polite">{monthLabel}</span>
        <button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-right-s-line"
          aria-label="Mois suivant"
          onclick={() => (viewMonth = addMonths(viewMonth, 1))}
        ></button>
      </div>

      <div class="datepicker-grid" role="grid">
        {#each WEEKDAYS as weekday, index (index)}
          <span class="datepicker-weekday" role="columnheader" aria-hidden="true">{weekday}</span>
        {/each}
        {#each days as day (day.getTime())}
          {@const outside = !isSameMonth(day, viewMonth)}
          {@const selected = selectedDate && isSameDay(day, selectedDate)}
          <button
            type="button"
            class="datepicker-day"
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
        <div class="datepicker-footer">
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

<style lang="scss">
  .datepicker {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
  }

  .datepicker-trigger {
    width: 100%;
    text-align: left;
    cursor: pointer;

    &.placeholder {
      color: var(--text-mention-grey);
    }
  }

  .datepicker-panel {
    position: absolute;
    z-index: 1000;
    top: calc(100% + 0.25rem);
    left: 0;
    width: 18rem;
    max-width: calc(100vw - 2rem);
    padding: 0.75rem;
    background-color: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    box-shadow: var(--overlap-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));

    &.open-above {
      top: auto;
      bottom: calc(100% + 0.25rem);
    }
  }

  .datepicker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .datepicker-month {
    font-weight: 700;
    text-transform: capitalize;
  }

  .datepicker-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.125rem;
  }

  .datepicker-weekday {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-mention-grey);
  }

  .datepicker-day {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2rem;
    border: 0;
    border-radius: 0.25rem;
    background: none;
    color: var(--text-default-grey);
    font-size: 0.875rem;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: var(--background-alt-grey-hover, rgba(0, 0, 0, 0.06));
    }

    &.outside {
      color: var(--text-disabled-grey);
    }

    &.today {
      box-shadow: inset 0 0 0 1px var(--border-active-blue-france);
    }

    &.selected {
      background-color: var(--background-action-high-blue-france);
      color: var(--text-inverted-blue-france);
    }

    &:disabled {
      color: var(--text-disabled-grey);
      cursor: not-allowed;
    }
  }

  .datepicker-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
</style>
