<script lang="ts">
  import MultiSelectFilter, { type FilterOption } from "@pitchou/ui/MultiSelectFilter.svelte";
  import DatePicker from "@pitchou/ui/DatePicker.svelte";

  type Props = {
    types: string[];
    selectedTypes: string[];
    dateFrom: string;
    dateTo: string;
    onChange: (updates: { evenements?: string[]; dateFrom?: string; dateTo?: string }) => void;
  };

  let { types, selectedTypes, dateFrom, dateTo, onChange }: Props = $props();

  const typeOptions = $derived<FilterOption[]>(types.map((type) => ({ value: type, label: type })));
</script>

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les évènements</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_12rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <span class="fr-label" id="label-evenement">Type d'évènement</span>
      <MultiSelectFilter
        id="filtre-evenement"
        label="Type d'évènement"
        allLabel="Tous les types"
        options={typeOptions}
        selected={selectedTypes}
        onChange={(evenements) => onChange({ evenements })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_12rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="date-from">À partir du</label>
      <DatePicker
        id="date-from"
        label="À partir du"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(value) => onChange({ dateFrom: value ?? "" })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_12rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="date-to">Jusqu'au</label>
      <DatePicker
        id="date-to"
        label="Jusqu'au"
        value={dateTo}
        min={dateFrom || undefined}
        align="right"
        onChange={(value) => onChange({ dateTo: value ?? "" })}
      />
    </div>
  </div>
</fieldset>
