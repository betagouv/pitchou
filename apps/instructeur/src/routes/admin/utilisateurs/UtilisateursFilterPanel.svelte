<script lang="ts">
  import type { NiveauAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { NIVEAUX, NIVEAU_LABELS } from "./utilisateursList.ts";

  type Props = {
    selectedNiveau: NiveauAARRI | "";
    onChange: (updates: { niveau?: NiveauAARRI | "" }) => void;
  };

  let { selectedNiveau, onChange }: Props = $props();
</script>

<fieldset id="panneau-filtres" class="panel">
  <legend class="panel-title">Filtrer les utilisateurices</legend>
  <div class="filters">
    <div class="filter-row">
      <label class="fr-label filter-label" for="select-niveau">Niveau AARRI</label>
      <select
        value={selectedNiveau}
        onchange={(e) => onChange({ niveau: e.currentTarget.value as NiveauAARRI | "" })}
        aria-label="Niveau AARRI choisi"
        class="fr-select"
        id="select-niveau"
      >
        <option value="" selected>Tous les niveaux</option>
        {#each NIVEAUX as niveau}
          <option value={niveau}>{NIVEAU_LABELS[niveau]}</option>
        {/each}
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
