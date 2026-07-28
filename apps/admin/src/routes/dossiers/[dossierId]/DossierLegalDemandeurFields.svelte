<script lang="ts">
  import { departements } from "@pitchou/common/departements.ts";
  import { dossierRegionOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel };
  let { model }: Props = $props();

  const departmentValues = new Set(departements.map(({ name }) => name));
  const hasLegacyDepartment = $derived(
    !!model.personneMorale.department && !departmentValues.has(model.personneMorale.department),
  );
  const hasLegacyRegion = $derived(
    !!model.personneMorale.region &&
      !dossierRegionOptions.includes(model.personneMorale.region as never),
  );
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
  <div class="fr-input-group w-full">
    <label class="fr-label" for="edit-legal-siret">
      SIRET <span class="fr-hint-text">14 chiffres</span>
    </label>
    <input
      class="fr-input w-full"
      id="edit-legal-siret"
      type="text"
      inputmode="numeric"
      pattern="[0-9]{14}"
      minlength="14"
      maxlength="14"
      required
      bind:value={model.personneMorale.siret}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for="edit-legal-name">Raison sociale</label>
    <input
      class="fr-input w-full"
      id="edit-legal-name"
      type="text"
      bind:value={model.personneMorale.legalName}
    />
  </div>
  <div class="fr-input-group w-full md:col-span-2">
    <label class="fr-label" for="edit-legal-address">Adresse</label>
    <input
      class="fr-input w-full"
      id="edit-legal-address"
      type="text"
      autocomplete="street-address"
      bind:value={model.personneMorale.address}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for="edit-legal-postal-code">Code postal</label>
    <input
      class="fr-input w-full"
      id="edit-legal-postal-code"
      type="text"
      inputmode="numeric"
      pattern="[0-9]{5}"
      maxlength="5"
      autocomplete="postal-code"
      bind:value={model.personneMorale.postalCode}
    />
  </div>
  <div class="fr-select-group w-full">
    <label class="fr-label" for="edit-legal-department">Département</label>
    <select
      class="fr-select w-full"
      id="edit-legal-department"
      bind:value={model.personneMorale.department}
    >
      <option value="">Non renseigné</option>
      {#if hasLegacyDepartment}
        <option value={model.personneMorale.department}>
          {model.personneMorale.department} (valeur historique)
        </option>
      {/if}
      {#each departements as department (department.code)}
        <option value={department.name}>{department.code} - {department.name}</option>
      {/each}
    </select>
  </div>
  <div class="fr-select-group w-full">
    <label class="fr-label" for="edit-legal-region">Région</label>
    <select
      class="fr-select w-full"
      id="edit-legal-region"
      bind:value={model.personneMorale.region}
    >
      <option value="">Non renseignée</option>
      {#if hasLegacyRegion}
        <option value={model.personneMorale.region}>
          {model.personneMorale.region} (valeur historique)
        </option>
      {/if}
      {#each dossierRegionOptions as region (region)}
        <option value={region}>{region}</option>
      {/each}
    </select>
  </div>
</div>
