<script lang="ts">
  import { dossierMainActiviteOptions } from "@pitchou/common/dossierFormOptions.ts";
  import Select from "@pitchou/ui/Select.svelte";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import DepartmentMultiSelect from "./DepartmentMultiSelect.svelte";
  import TriStateRadio from "./TriStateRadio.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  const hasLegacyActivity = $derived(
    !!model.mainActivite && !dossierMainActiviteOptions.includes(model.mainActivite as never),
  );

  // A value predating the current list stays selectable, so opening a dossier
  // never silently drops it.
  const mainActiviteOptions = $derived([
    { value: "", label: "Non renseignée" },
    ...(hasLegacyActivity
      ? [{ value: model.mainActivite, label: `${model.mainActivite} (valeur historique)` }]
      : []),
    ...dossierMainActiviteOptions.map((option) => ({ value: option, label: option })),
  ]);
</script>

<fieldset class="fr-fieldset w-full" aria-label="Identification du projet" {disabled}>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-name"
        >Nom du projet permettant de l'identifier clairement</label
      >
      <input
        class="fr-input w-full"
        id="edit-name"
        type="text"
        autocomplete="off"
        data-form-type="other"
        data-1p-ignore
        bind:value={model.name}
      />
    </div>
  </div>
  <div class="fr-fieldset__element">
    <DepartmentMultiSelect
      id="edit-departments"
      label="Dans quel département se localise majoritairement votre projet ?"
      selected={model.departments}
      onChange={(value) => (model.departments = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-main-activite">
        Activité principale
        <span class="fr-hint-text">Indiquez l'activité principale relative à votre projet.</span>
      </label>
      <Select
        id="edit-main-activite"
        class="fr-mt-1w"
        options={mainActiviteOptions}
        bind:value={model.mainActivite}
      />
    </div>
  </div>
  <div class="fr-fieldset__element">
    <TriStateRadio
      id="edit-ecological-inventory"
      label="Avez-vous réalisé un état des lieux écologique complet ?"
      value={model.ecologicalInventoryCompleted}
      onChange={(value) => (model.ecologicalInventoryCompleted = value)}
    />
  </div>
  {#if model.ecologicalInventoryCompleted === "oui"}
    <div class="fr-fieldset__element">
      <TriStateRadio
        id="edit-especes-influence-area"
        label="Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?"
        hint="L'aire d'influence s'appuie sur les éléments physiques qui délimitent naturellement le territoire et permettent d'identifier les corridors écologiques et la fonctionnalité des habitats."
        value={model.especesPresentInInfluenceArea}
        onChange={(value) => (model.especesPresentInInfluenceArea = value)}
      />
    </div>
  {/if}
  {#if model.ecologicalInventoryCompleted === "oui" && model.especesPresentInInfluenceArea === "oui"}
    <div class="fr-fieldset__element">
      <TriStateRadio
        id="edit-risk-despite-erc"
        label="Après mise en œuvre des mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?"
        value={model.riskDespiteErcMesures}
        onChange={(value) => (model.riskDespiteErcMesures = value)}
      />
    </div>
  {/if}
</fieldset>
