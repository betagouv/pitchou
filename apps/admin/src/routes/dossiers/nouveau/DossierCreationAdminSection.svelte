<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import type { AdminGroupeInstructeurs } from "$lib/actions/adminDossiers.ts";
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model, groupes }: { model: DossierCreationModel; groupes: AdminGroupeInstructeurs[] } =
    $props();
</script>

<details class="fr-p-3w border border-[color:var(--border-default-grey)]">
  <summary class="fr-h4 fr-mb-0 cursor-pointer">Affectation dans Pitchou</summary>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 fr-mt-3w">
    <div class="fr-input-group">
      <DatePicker
        id="dossier-depot-date"
        label="Date de dépôt"
        value={model.depotDate}
        onChange={(value) => (model.depotDate = value ?? "")}
      />
    </div>
    <div class="fr-select-group">
      <label class="fr-label" for="dossier-phase">Phase initiale</label>
      <select class="fr-select" id="dossier-phase" bind:value={model.phase}>
        {#each [...phases] as phase (phase)}<option value={phase}>{phase}</option>{/each}
      </select>
    </div>
    <div class="fr-select-group">
      <label class="fr-label" for="dossier-groupe">
        Groupe instructeurs
        <span class="fr-hint-text">Le dossier ne sera visible que par ce groupe.</span>
      </label>
      <select class="fr-select" id="dossier-groupe" required bind:value={model.groupeInstructeurs}>
        {#each groupes as groupe (groupe.id)}<option value={groupe.id}>{groupe.name}</option>{/each}
      </select>
    </div>
  </div>
</details>
