<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";

  import type { NiveauAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { NIVEAUX, NIVEAU_LABELS } from "./utilisateursList.ts";

  type Props = {
    selectedNiveau: NiveauAARRI | "";
    selectedGroupe: string;
    groupes: string[];
    onChange: (updates: { niveau?: NiveauAARRI | ""; groupe?: string }) => void;
  };

  let { selectedNiveau, selectedGroupe, groupes, onChange }: Props = $props();

  const niveauOptions = [
    { value: "" as NiveauAARRI | "", label: "Tous les niveaux" },
    ...NIVEAUX.map((niveau) => ({ value: niveau, label: NIVEAU_LABELS[niveau] })),
  ];

  const groupeOptions = $derived([
    { value: "", label: "Tous les groupes" },
    ...groupes.map((groupe) => ({ value: groupe, label: groupe })),
  ]);
</script>

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les utilisateurices</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-niveau">Niveau AARRI</label>
      <Select
        id="select-niveau"
        class="flex-auto"
        ariaLabel="Niveau AARRI choisi"
        options={niveauOptions}
        value={selectedNiveau}
        onChange={(niveau) => onChange({ niveau })}
      />
    </div>
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none"
    >
      <label class="fr-label" for="select-groupe">Groupe instructeur</label>
      <Select
        id="select-groupe"
        class="flex-auto"
        ariaLabel="Groupe instructeur choisi"
        options={groupeOptions}
        value={selectedGroupe}
        onChange={(groupe) => onChange({ groupe })}
      />
    </div>
  </div>
</fieldset>
