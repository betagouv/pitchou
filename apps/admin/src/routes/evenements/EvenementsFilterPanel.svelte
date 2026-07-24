<script lang="ts">
  type Props = {
    types: string[];
    selectedType: string;
    dateFrom: string;
    dateTo: string;
    onChange: (updates: { evenement?: string; dateFrom?: string; dateTo?: string }) => void;
  };

  let { types, selectedType, dateFrom, dateTo, onChange }: Props = $props();
</script>

<fieldset id="filter-panel" class="panel">
  <legend class="panel-title">Filtrer les évènements</legend>
  <div class="filters">
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-evenement">Type d'évènement</label>
      <select
        value={selectedType}
        onchange={(e) => onChange({ evenement: e.currentTarget.value })}
        aria-label="Type d'évènement choisi"
        class="fr-select"
        id="select-evenement"
      >
        <option value="">Tous les types</option>
        {#each types as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="date-from">À partir du</label>
      <input
        value={dateFrom}
        onchange={(e) => onChange({ dateFrom: e.currentTarget.value })}
        class="fr-input"
        id="date-from"
        type="date"
      />
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="date-to">Jusqu'au</label>
      <input
        value={dateTo}
        onchange={(e) => onChange({ dateTo: e.currentTarget.value })}
        class="fr-input"
        id="date-to"
        type="date"
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

    .fr-select,
    .fr-input {
      flex: 1 1 auto;
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
