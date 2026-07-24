<script lang="ts">
  import type { BdcStatutFiltres } from "./bdcStatutsList.ts";

  type Props = {
    filtres: BdcStatutFiltres | null;
    selectedStatut: string;
    onChange: (updates: { statut?: string }) => void;
  };

  let { filtres, selectedStatut, onChange }: Props = $props();
</script>

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les statuts</legend>
  {#if !filtres}
    <p class="fr-text--sm">Chargement des filtres…</p>
  {:else}
    <div class="flex flex-col gap-3 max-w-[48rem]">
      <div
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
      >
        <label class="fr-label" for="select-statut">Type de statut</label>
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
