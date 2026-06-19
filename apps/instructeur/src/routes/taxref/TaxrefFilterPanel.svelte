<script lang="ts">
  import type { TaxrefFiltres } from "./taxrefList.ts";

  type Props = {
    filtres: TaxrefFiltres | null;
    selectedRegne: string;
    selectedClasse: string;
    onChange: (updates: { regne?: string; classe?: string }) => void;
  };

  let { filtres, selectedRegne, selectedClasse, onChange }: Props = $props();
</script>

<fieldset id="panneau-filtres" class="panel">
  <legend class="panel-title">Filtrer les taxons</legend>
  {#if !filtres}
    <p class="fr-text--sm">Chargement des filtres…</p>
  {:else}
    <div class="filters">
      <div class="filter-row">
        <label class="fr-label filter-label" for="select-regne">Règne</label>
        <select
          value={selectedRegne}
          onchange={(e) => onChange({ regne: e.currentTarget.value })}
          aria-label="Règne choisi"
          class="fr-select"
          id="select-regne"
        >
          <option value="">Tous les règnes</option>
          {#each filtres.regnes as regne}
            <option value={regne}>{regne}</option>
          {/each}
        </select>
      </div>
      <div class="filter-row">
        <label class="fr-label filter-label" for="select-classe">Classe</label>
        <select
          value={selectedClasse}
          onchange={(e) => onChange({ classe: e.currentTarget.value })}
          aria-label="Classe choisie"
          class="fr-select"
          id="select-classe"
        >
          <option value="">Toutes les classes</option>
          {#each filtres.classes as classe}
            <option value={classe}>{classe}</option>
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
