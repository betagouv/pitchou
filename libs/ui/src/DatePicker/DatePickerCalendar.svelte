<script lang="ts">
  import { format, isSameDay, isSameMonth, isToday } from "date-fns";
  import { fr } from "date-fns/locale";
  import { WEEKDAYS } from "./datePicker.ts";

  type Props = {
    id: string;
    label: string;
    align: "left" | "right";
    openAbove: boolean;
    viewMonth: Date;
    monthLabel: string;
    days: Date[];
    selectedDate?: Date;
    isDisabled: (day: Date) => boolean;
    onPreviousMonth: () => void;
    onNextMonth: () => void;
    onSelect: (day: Date) => void;
    onClear: () => void;
  };

  let {
    id,
    label,
    align,
    openAbove,
    viewMonth,
    monthLabel,
    days,
    selectedDate,
    isDisabled,
    onPreviousMonth,
    onNextMonth,
    onSelect,
    onClear,
  }: Props = $props();
</script>

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
      onclick={onPreviousMonth}
    ></button>
    <span class="fr-text--bold capitalize" aria-live="polite">{monthLabel}</span>
    <button
      type="button"
      class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-right-s-line"
      aria-label="Mois suivant"
      onclick={onNextMonth}
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
        onclick={() => onSelect(day)}
      >
        {day.getDate()}
      </button>
    {/each}
  </div>

  {#if selectedDate}
    <div class="flex justify-end fr-mt-1w">
      <button type="button" class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm" onclick={onClear}>
        Effacer
      </button>
    </div>
  {/if}
</div>
