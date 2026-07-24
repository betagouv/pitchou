<script lang="ts">
  import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";
  import { CLASSIFICATIONS, STATUTS, type Statut, type ListeFilter } from "./especesList.ts";

  type Props = {
    selectedClassification: ClassificationEtreVivant | "";
    selectedStatut: Statut | "";
    selectedListe: ListeFilter;
    onChange: (updates: {
      classification?: ClassificationEtreVivant | "";
      statut?: Statut | "";
      liste?: ListeFilter;
    }) => void;
  };

  let { selectedClassification, selectedStatut, selectedListe, onChange }: Props = $props();
</script>

<fieldset
  id="filter-panel-especes"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les espèces</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
    >
      <label class="fr-label" for="select-classification">Classification</label>
      <select
        value={selectedClassification}
        onchange={(e) =>
          onChange({ classification: e.currentTarget.value as ClassificationEtreVivant | "" })}
        aria-label="Classification choisie"
        class="fr-select"
        id="select-classification"
      >
        <option value="" selected>Toutes les classifications</option>
        {#each CLASSIFICATIONS as classification}
          <option value={classification}>{classification}</option>
        {/each}
      </select>
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
    >
      <label class="fr-label" for="select-statut">Statut de protection</label>
      <select
        value={selectedStatut}
        onchange={(e) => onChange({ statut: e.currentTarget.value as Statut | "" })}
        aria-label="Statut de protection choisi"
        class="fr-select"
        id="select-statut"
      >
        <option value="" selected>Tous les statuts</option>
        {#each STATUTS as statut}
          <option value={statut}>{statut}</option>
        {/each}
      </select>
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
    >
      <label class="fr-label" for="select-liste">Liste (ministérielle / CNPN)</label>
      <select
        value={selectedListe}
        onchange={(e) => onChange({ liste: e.currentTarget.value as ListeFilter })}
        aria-label="Liste d'espèces choisie"
        class="fr-select"
        id="select-liste"
      >
        <option value="" selected>Toutes les espèces</option>
        <option value="ministerielle">Espèce ministérielle</option>
        <option value="cnpn">Espèce CNPN</option>
      </select>
    </div>
  </div>
</fieldset>
