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

<fieldset
  id="filter-panel-taxref"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les taxons</legend>
  {#if !filtres}
    <p class="fr-text--sm">Chargement des filtres…</p>
  {:else}
    <div class="flex flex-col gap-3 max-w-[48rem]">
      <div
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
      >
        <label class="fr-label" for="select-regne">Règne</label>
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
      <div
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
      >
        <label class="fr-label" for="select-classe">Classe</label>
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
