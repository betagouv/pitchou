<script lang="ts">
  import MultiSelectFilter, { type FilterOption } from "@pitchou/ui/MultiSelectFilter.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import { departements } from "@pitchou/common/departements.ts";
  import { dossierRegionOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel, LocationScope } from "./dossierAdminFormModel.ts";
  import CommuneSelector from "./CommuneSelector.svelte";
  import DepartmentMultiSelect from "./DepartmentMultiSelect.svelte";
  import DossierProjectMapField from "./DossierProjectMapField.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  function includeLegacy(options: FilterOption[], selected: string[]) {
    const values = new Set(options.map(({ value }) => value));
    return [
      ...options,
      ...selected
        .filter((value) => !values.has(value))
        .map((value) => ({ value, label: `${value} (valeur historique)` })),
    ];
  }

  const regionOptions = $derived(
    includeLegacy(
      dossierRegionOptions.map((region) => ({ value: region, label: region })),
      model.regions,
    ),
  );

  const primaryDepartmentOptions = [
    { value: "", label: "Non renseigné" },
    ...departements.map((department) => ({
      value: department.code,
      label: `${department.code} - ${department.name}`,
    })),
  ];

  const scopes: { value: LocationScope; label: string }[] = [
    { value: "communes", label: "d'une ou plusieurs communes" },
    { value: "departements", label: "d'un ou plusieurs départements" },
    { value: "regions", label: "d'une ou plusieurs régions" },
    { value: "france", label: "de toute la France" },
    { value: "", label: "Non renseigné" },
  ];
</script>

<div class="w-full flex flex-col gap-6">
  <div class="fr-select-group w-full">
    <label class="fr-label" for="edit-primary-department">
      Département dans lequel se situe majoritairement le projet
    </label>
    <Select
      id="edit-primary-department"
      class="fr-mt-1w"
      {disabled}
      options={primaryDepartmentOptions}
      bind:value={model.primaryDepartment}
    />
  </div>

  <fieldset class="fr-fieldset fr-mb-0" aria-labelledby="edit-location-scope-legend">
    <legend class="fr-fieldset__legend fr-text--regular" id="edit-location-scope-legend">
      Le projet se situe au niveau…
    </legend>
    {#each scopes as scope (scope.value)}
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            id={`edit-location-scope-${scope.value || "empty"}`}
            type="radio"
            name="edit-location-scope"
            value={scope.value}
            checked={model.locationScope === scope.value}
            onchange={() => (model.locationScope = scope.value)}
          />
          <label class="fr-label" for={`edit-location-scope-${scope.value || "empty"}`}>
            {scope.label}
          </label>
        </div>
      </div>
    {/each}
  </fieldset>

  {#if model.locationScope === "communes"}
    <CommuneSelector
      value={model.communes}
      {disabled}
      onChange={(value) => (model.communes = value)}
    />
  {:else if model.locationScope === "departements"}
    <DepartmentMultiSelect
      id="edit-location-departments"
      label="Département(s) où se situe le projet"
      selected={model.departments}
      onChange={(value) => (model.departments = value)}
    />
  {:else if model.locationScope === "regions"}
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-regions">Région(s) où se situe le projet</label>
      <MultiSelectFilter
        id="edit-regions"
        label="Régions"
        allLabel="Aucune région"
        options={regionOptions}
        selected={model.regions}
        onChange={(value) => (model.regions = value)}
      />
    </div>
  {/if}

  <div>
    <DossierProjectMapField
      value={model.projetMap}
      {disabled}
      onChange={(value) => (model.projetMap = value)}
    />
  </div>
</div>
