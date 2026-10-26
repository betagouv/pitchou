<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model, showPhase = true }: { model: DossierCreationModel; showPhase?: boolean } = $props();

  const phaseOptions = [...phases].map((phase) => ({ value: phase, label: phase }));
</script>

<details class="fr-p-3w border border-[color:var(--border-default-grey)]">
  <summary class="fr-mb-0 cursor-pointer"
    >{showPhase ? "Affectation dans Pitchou" : "Dates du dossier"}</summary
  >
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 fr-mt-2w">
    <div class="fr-input-group">
      <label class="fr-label" for="dossier-depot-date">Date de création du dossier</label>
      <DatePicker
        id="dossier-depot-date"
        label="Date de création du dossier"
        value={model.depotDate}
        onChange={(value) => (model.depotDate = value ?? "")}
      />
    </div>
    {#if showPhase}
      <div class="fr-select-group">
        <label class="fr-label" for="dossier-phase">Phase initiale</label>
        <Select
          id="dossier-phase"
          class="fr-mt-1w"
          options={phaseOptions}
          bind:value={model.phase}
        />
      </div>
      <p>Les groupes instructeurs sont déterminés par le département principal du dossier.</p>
    {/if}
  </div>
</details>
