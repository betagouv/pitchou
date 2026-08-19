<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";

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

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les modifications</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-classification">Classification</label>
      <Select
        id="select-classification"
        class="flex-auto"
        ariaLabel="Classification choisie"
        options={[
          { value: "", label: "Toutes les classifications" },
          ...CLASSIFICATIONS.map((classification) => ({
            value: classification,
            label: classification,
          })),
        ]}
        value={selectedClassification}
        onChange={(classification) => onChange({ classification })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-statut">Statut de protection</label>
      <Select
        id="select-statut"
        class="flex-auto"
        ariaLabel="Statut de protection choisi"
        options={[
          { value: "", label: "Tous les statuts" },
          ...STATUTS.map((statut) => ({ value: statut, label: statut })),
        ]}
        value={selectedStatut}
        onChange={(statut) => onChange({ statut })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-etat">État</label>
      <Select
        id="select-etat"
        class="flex-auto"
        ariaLabel="État choisi"
        options={[
          { value: "", label: "Toutes les modifications" },
          { value: "actives", label: "Non exclues" },
          { value: "exclues", label: "Exclues" },
        ]}
        value={selectedEtat}
        onChange={(etat) => onChange({ etat: etat as EtatFilter })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-liste">Liste (ministérielle / CNPN)</label>
      <Select
        id="select-liste"
        class="flex-auto"
        ariaLabel="Liste d'espèces choisie"
        options={[
          { value: "", label: "Toutes les espèces" },
          { value: "ministerielle", label: "Espèce ministérielle" },
          { value: "cnpn", label: "Espèce CNPN" },
        ]}
        value={selectedListe}
        onChange={(liste) => onChange({ liste: liste as ListeFilter })}
      />
    </div>
  </div>
</fieldset>
