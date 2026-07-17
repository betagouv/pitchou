<script lang="ts">
  import type { BdcStatutFiltres } from "./bdcStatutsList.ts";

  type Props = {
    filtres: BdcStatutFiltres | null;
    selectedStatut: string;
    onChange: (updates: { statut?: string }) => void;
  };

  let { filtres, selectedStatut, onChange }: Props = $props();
</script>

<fieldset id="filter-panel" class="panel">
  <legend class="panel-title">Filtrer les statuts</legend>
  {#if !filtres}
    <p class="fr-text--sm">Chargement des filtres…</p>
  {:else}
    <div class="filters">
      <div class="filter-row">
        <label class="fr-label filter-label" for="select-statut">Type de statut</label>
        <select
          value={selectedStatut}
          onchange={(e) => onChange({ statut: e.currentTarget.value })}
          aria-label="Type de statut choisi"
          class="fr-select"
          id="select-statut"
        >
          <option value="">Tous les types de statut</option>
          {#each filtres.statuts as statut}
            <option value={statut}>{statut}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}
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
      flex: 0 0 18rem;
      margin-bottom: 0;
    }

    .fr-select {
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
