<script lang="ts">
  import { phases } from "@pitchou/common/phases.ts";
  import type { DossiersQuery } from "$lib/actions/adminDossiers.ts";

  type Props = {
    query: DossiersQuery;
    onSearch: (value: string) => void;
    onFilter: () => void;
  };

  let { query = $bindable(), onSearch, onFilter }: Props = $props();
</script>

<div class="flex flex-row items-end gap-4 max-[768px]:flex-col max-[768px]:items-stretch">
  <form class="flex-1" onsubmit={(e) => e.preventDefault()}>
    <div class="fr-search-bar w-full" role="search">
      <label class="fr-label" for="recherche-dossier">Rechercher un dossier</label>
      <input
        value={query.search}
        oninput={(e) => onSearch(e.currentTarget.value)}
        name="texte-de-recherche"
        class="fr-input"
        placeholder="Nom, demandeur ou numéro DN"
        id="recherche-dossier"
        type="search"
      />
      <button title="Rechercher un dossier" type="submit" class="fr-btn">Rechercher</button>
    </div>
  </form>

  <div class="fr-select-group fr-mb-0">
    <label class="fr-label" for="filtre-phase">Phase</label>
    <select class="fr-select" id="filtre-phase" bind:value={query.phase} onchange={onFilter}>
      <option value="">Toutes</option>
      {#each [...phases] as phase (phase)}
        <option value={phase}>{phase}</option>
      {/each}
    </select>
  </div>

  <div class="fr-select-group fr-mb-0">
    <label class="fr-label" for="filtre-source">Source</label>
    <select class="fr-select" id="filtre-source" bind:value={query.source} onchange={onFilter}>
      <option value="">Toutes</option>
      <option value="pitchou">Créé dans Pitchou</option>
      <option value="dn">Importé de Démarches Numériques</option>
      <option value="unknown">Source inconnue</option>
    </select>
  </div>
</div>
