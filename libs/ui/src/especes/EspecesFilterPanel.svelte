<script lang="ts">
  import Select from "../Select.svelte";

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

  const classificationOptions = [
    { value: "" as ClassificationEtreVivant | "", label: "Toutes les classifications" },
    ...CLASSIFICATIONS.map((classification) => ({
      value: classification,
      label: classification,
    })),
  ];

  const statutOptions = [
    { value: "" as Statut | "", label: "Tous les statuts" },
    ...STATUTS.map((statut) => ({ value: statut, label: statut })),
  ];

  const listeOptions: { value: ListeFilter; label: string }[] = [
    { value: "", label: "Toutes les espèces" },
    { value: "ministerielle", label: "Espèce ministérielle" },
    { value: "cnpn", label: "Espèce CNPN" },
  ];
</script>

<fieldset
  id="filter-panel-especes"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les espèces</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-classification">Classification</label>
      <Select
        id="select-classification"
        class="flex-auto"
        ariaLabel="Classification choisie"
        options={classificationOptions}
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
        options={statutOptions}
        value={selectedStatut}
        onChange={(statut) => onChange({ statut })}
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
        options={listeOptions}
        value={selectedListe}
        onChange={(liste) => onChange({ liste })}
      />
    </div>
  </div>
</fieldset>
