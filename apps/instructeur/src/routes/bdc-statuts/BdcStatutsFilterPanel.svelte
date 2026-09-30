<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import UicnFilter from "@pitchou/ui/especes/UicnFilter.svelte";
  import type { StatutListeRouge } from "@pitchou/types/especes.d.ts";

  import type { BdcStatutFiltres } from "./bdcStatutsList.ts";

  type Props = {
    filtres: BdcStatutFiltres | null;
    selectedStatut: string;
    selectedUicn: StatutListeRouge | "";
    onChange: (updates: { statut?: string; uicn?: StatutListeRouge | "" }) => void;
  };

  let { filtres, selectedStatut, selectedUicn, onChange }: Props = $props();
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
      <UicnFilter value={selectedUicn} onChange={(uicn) => onChange({ uicn })} />
      <div
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:mb-0 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:max-[768px]:flex-none"
      >
        <label class="fr-label" for="select-statut">Type de statut</label>
        <Select
          id="select-statut"
          class="flex-auto"
          ariaLabel="Type de statut choisi"
          options={[
            { value: "", label: "Tous les types de statut" },
            ...filtres.statuts.map((statut) => ({ value: statut, label: statut })),
          ]}
          value={selectedStatut}
          onChange={(statut) => onChange({ statut })}
        />
      </div>
    </div>
  {/if}
</fieldset>
