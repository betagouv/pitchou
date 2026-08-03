<script lang="ts">
  import { departements } from "@pitchou/common/departements.ts";
  import { dossierRegionOptions } from "@pitchou/common/dossierFormOptions.ts";
  import MultiSelectFilter from "@pitchou/ui/MultiSelectFilter.svelte";

  import CommuneSelector from "../[dossierId]/CommuneSelector.svelte";
  import DepartmentMultiSelect from "../[dossierId]/DepartmentMultiSelect.svelte";
  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();

  const scopes = [
    { value: "communes", label: "d'une ou plusieurs communes" },
    { value: "departements", label: "d'un ou plusieurs départements" },
    { value: "regions", label: "d'une ou plusieurs régions" },
    { value: "france", label: "de toute la France" },
  ] as const;
  const regionOptions = dossierRegionOptions.map((region) => ({ value: region, label: region }));
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="location-title"
>
  <h2 class="fr-h2" id="location-title">4. Localisation du projet</h2>

  <div class="fr-select-group w-full fr-mb-4w">
    <label class="fr-label" for="location-primary-department">
      Dans quel département se localise majoritairement votre projet ?
      <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
      <span class="fr-hint-text">
        Cela nous permet de déterminer le service instructeur en charge du dossier.
      </span>
    </label>
    <select
      class="fr-select"
      id="location-primary-department"
      required
      bind:value={model.primaryDepartment}
    >
      <option value="" disabled>Sélectionnez un département</option>
      {#each departements as department (department.code)}
        <option value={department.code}>{department.code} – {department.name}</option>
      {/each}
    </select>
  </div>

  <fieldset class="fr-fieldset fr-mb-0" aria-labelledby="location-scope-legend">
    <legend class="fr-fieldset__legend font-normal" id="location-scope-legend">
      Le projet se situe au niveau… <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </legend>
    {#each scopes as scope, index (scope.value)}
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            id={`location-scope-${scope.value}`}
            type="radio"
            name="location-scope"
            value={scope.value}
            required={index === 0}
            bind:group={model.locationScope}
          />
          <label class="fr-label" for={`location-scope-${scope.value}`}>{scope.label}</label>
        </div>
      </div>
    {/each}
  </fieldset>

  {#if model.locationScope === "communes"}
    <CommuneSelector
      id="creation-commune-search"
      label="Nom de la commune"
      value={model.communes}
      onChange={(value) => (model.communes = value)}
    />
  {:else if model.locationScope === "departements"}
    <DepartmentMultiSelect
      id="creation-location-departments"
      label="Nom du département"
      selected={model.locationDepartments}
      onChange={(value) => (model.locationDepartments = value)}
    />
  {:else if model.locationScope === "regions"}
    <div class="fr-select-group w-full">
      <label class="fr-label" for="creation-location-regions">Nom de la région</label>
      <MultiSelectFilter
        id="creation-location-regions"
        label="Régions"
        allLabel="Aucune région"
        options={regionOptions}
        selected={model.locationRegions}
        onChange={(value) => (model.locationRegions = value)}
      />
    </div>
  {/if}
</section>
