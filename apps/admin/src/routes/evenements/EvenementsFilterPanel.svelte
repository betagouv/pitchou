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

<fieldset id="filter-panel" class="panel">
  <legend class="panel-title">Filtrer les évènements</legend>
  <div class="filters">
    <div class="filter-row">
      <span class="fr-label filter-label" id="label-evenement">Type d'évènement</span>
      <MultiSelectFilter
        id="filtre-evenement"
        label="Type d'évènement"
        allLabel="Tous les types"
        options={typeOptions}
        selected={selectedTypes}
        onChange={(evenements) => onChange({ evenements })}
      />
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="date-from">À partir du</label>
      <DatePicker
        id="date-from"
        label="À partir du"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(value) => onChange({ dateFrom: value ?? "" })}
      />
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="date-to">Jusqu'au</label>
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

<style lang="scss">
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }

  .panel {
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    padding: 1rem;
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    padding: 0;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 48rem;
  }

  .filter-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;

    .filter-label {
      flex: 0 0 12rem;
      margin-bottom: 0;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 0.25rem;

      .filter-label {
        flex: none;
      }
    }
  }
</style>
