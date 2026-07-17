<script lang="ts">
  import {
    CLASSIFICATIONS,
    STATUTS,
    type EtatFilter,
    type ListeFilter,
  } from "./adminModificationsList.ts";

  type Props = {
    selectedClassification: string;
    selectedStatut: string;
    selectedEtat: EtatFilter;
    selectedListe: ListeFilter;
    onChange: (updates: {
      classification?: string;
      statut?: string;
      etat?: EtatFilter;
      liste?: ListeFilter;
    }) => void;
  };

  let { selectedClassification, selectedStatut, selectedEtat, selectedListe, onChange }: Props =
    $props();
</script>

<fieldset id="filter-panel" class="panel">
  <legend class="panel-title">Filtrer les modifications</legend>
  <div class="filters">
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-classification">Classification</label>
      <select
        value={selectedClassification}
        onchange={(e) => onChange({ classification: e.currentTarget.value })}
        aria-label="Classification choisie"
        class="fr-select"
        id="select-classification"
      >
        <option value="">Toutes les classifications</option>
        {#each CLASSIFICATIONS as classification}
          <option value={classification}>{classification}</option>
        {/each}
      </select>
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-statut">Statut de protection</label>
      <select
        value={selectedStatut}
        onchange={(e) => onChange({ statut: e.currentTarget.value })}
        aria-label="Statut de protection choisi"
        class="fr-select"
        id="select-statut"
      >
        <option value="">Tous les statuts</option>
        {#each STATUTS as statut}
          <option value={statut}>{statut}</option>
        {/each}
      </select>
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-etat">État</label>
      <select
        value={selectedEtat}
        onchange={(e) => onChange({ etat: e.currentTarget.value as EtatFilter })}
        aria-label="État choisi"
        class="fr-select"
        id="select-etat"
      >
        <option value="">Toutes les modifications</option>
        <option value="actives">Non exclues</option>
        <option value="exclues">Exclues</option>
      </select>
    </div>
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-liste">Liste (ministérielle / CNPN)</label>
      <select
        value={selectedListe}
        onchange={(e) => onChange({ liste: e.currentTarget.value as ListeFilter })}
        aria-label="Liste d'espèces choisie"
        class="fr-select"
        id="select-liste"
      >
        <option value="">Toutes les espèces</option>
        <option value="ministerielle">Espèce ministérielle</option>
        <option value="cnpn">Espèce CNPN</option>
      </select>
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
