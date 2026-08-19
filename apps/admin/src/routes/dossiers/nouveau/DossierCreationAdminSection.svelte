<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import Select from "@pitchou/ui/Select.svelte";
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
      <Select
        id="dossier-phase"
        options={[...phases].map((phase) => ({ value: phase, label: phase }))}
        bind:value={model.phase}
      />
    </div>
    <div class="fr-select-group">
      <label class="fr-label" for="dossier-groupe">
        Groupe instructeurs
        <span class="fr-hint-text">Le dossier ne sera visible que par ce groupe.</span>
      </label>
      <Select
        id="dossier-groupe"
        required
        options={groupes.map((groupe) => ({ value: groupe.id, label: groupe.name }))}
        bind:value={model.groupeInstructeurs}
      />
    </div>
  </div>
</details>
