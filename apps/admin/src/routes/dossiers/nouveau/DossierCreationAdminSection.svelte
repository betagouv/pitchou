<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import { phases } from "@pitchou/common/phases.ts";

  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();

  const phaseOptions = [...phases].map((phase) => ({ value: phase, label: phase }));
</script>

<details class="fr-p-3w border border-[color:var(--border-default-grey)]">
  <summary class="fr-mb-0 cursor-pointer">Affectation dans Pitchou</summary>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 fr-mt-2w">
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
      <Select id="dossier-phase" class="fr-mt-1w" options={phaseOptions} bind:value={model.phase} />
    </div>
    <p>Les groupes instructeurs sont déterminés par le département principal du dossier.</p>
  </div>
</details>
