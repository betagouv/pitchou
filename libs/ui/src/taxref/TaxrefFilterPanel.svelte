<script lang="ts">
  import Select from "../Select.svelte";

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
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
      >
        <label class="fr-label" for="select-regne">Règne</label>
        <Select
          id="select-regne"
          class="flex-auto"
          ariaLabel="Règne choisi"
          options={[
            { value: "", label: "Tous les règnes" },
            ...filtres.regnes.map((regne) => ({ value: regne, label: regne })),
          ]}
          value={selectedRegne}
          onChange={(regne) => onChange({ regne })}
        />
      </div>
      <div
        class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
      >
        <label class="fr-label" for="select-classe">Classe</label>
        <Select
          id="select-classe"
          class="flex-auto"
          ariaLabel="Classe choisie"
          options={[
            { value: "", label: "Toutes les classes" },
            ...filtres.classes.map((classe) => ({ value: classe, label: classe })),
          ]}
          value={selectedClasse}
          onChange={(classe) => onChange({ classe })}
        />
      </div>
    </div>
  {/if}
</fieldset>
