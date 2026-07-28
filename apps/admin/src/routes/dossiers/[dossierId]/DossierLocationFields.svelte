<script lang="ts">
  import MultiSelectFilter, { type FilterOption } from "@pitchou/ui/MultiSelectFilter.svelte";
  import { departements } from "@pitchou/common/departements.ts";
  import { dossierRegionOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import CommuneSelector from "./CommuneSelector.svelte";
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

  const departmentOptions = $derived(
    includeLegacy(
      departements.map(({ code, name }) => ({ value: code, label: `${code} - ${name}` })),
      model.departments,
    ),
  );
  const regionOptions = $derived(
    includeLegacy(
      dossierRegionOptions.map((region) => ({ value: region, label: region })),
      model.regions,
    ),
  );
</script>

<fieldset class="fr-fieldset w-full" aria-label="Localisation" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Localisation</legend>
  <div class="fr-fieldset__element">
    <CommuneSelector
      value={model.communes}
      {disabled}
      onChange={(value) => (model.communes = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div class="fr-select-group w-full">
        <label class="fr-label" for="edit-departments">Départements</label>
        <MultiSelectFilter
          id="edit-departments"
          label="Départements"
          allLabel="Aucun département"
          options={departmentOptions}
          selected={model.departments}
          onChange={(value) => (model.departments = value)}
        />
      </div>
      <div class="fr-select-group w-full">
        <label class="fr-label" for="edit-regions">Régions</label>
        <MultiSelectFilter
          id="edit-regions"
          label="Régions"
          allLabel="Aucune région"
          options={regionOptions}
          selected={model.regions}
          onChange={(value) => (model.regions = value)}
        />
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <DossierProjectMapField
      value={model.projetMap}
      {disabled}
      onChange={(value) => (model.projetMap = value)}
    />
  </div>
</fieldset>
