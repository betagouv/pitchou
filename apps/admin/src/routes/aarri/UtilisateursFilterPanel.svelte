<script lang="ts">
  import type { NiveauAARRI } from "@pitchou/types/API_Pitchou.ts";
  import { NIVEAUX, NIVEAU_LABELS } from "./utilisateursList.ts";

  type Props = {
    selectedNiveau: NiveauAARRI | "";
    selectedGroupe: string;
    groupes: string[];
    onChange: (updates: { niveau?: NiveauAARRI | ""; groupe?: string }) => void;
  };

  let { selectedNiveau, selectedGroupe, groupes, onChange }: Props = $props();
</script>

<fieldset
  id="filter-panel"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les utilisateurices</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
    >
      <label class="fr-label" for="select-niveau">Niveau AARRI</label>
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
    <div
      class="flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:mb-0 [&_.fr-label]:max-[768px]:flex-none [&_.fr-select]:flex-auto"
    >
      <label class="fr-label" for="select-groupe">Groupe instructeur</label>
      <select
        value={selectedGroupe}
        onchange={(e) => onChange({ groupe: e.currentTarget.value })}
        aria-label="Groupe instructeur choisi"
        class="fr-select"
        id="select-groupe"
      >
        <option value="" selected>Tous les groupes</option>
        {#each groupes as groupe}
          <option value={groupe}>{groupe}</option>
        {/each}
      </select>
    </div>
  </div>
</fieldset>
