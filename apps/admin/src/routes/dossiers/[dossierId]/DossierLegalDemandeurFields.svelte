<script lang="ts">
  import { departements } from "@pitchou/common/departements.ts";
  import { dossierRegionOptions } from "@pitchou/common/dossierFormOptions.ts";
  import Select from "@pitchou/ui/Select.svelte";

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

  // A value predating the current list stays selectable, so opening a dossier
  // never silently drops it.
  const departmentOptions = $derived([
    { value: "", label: "Non renseigné" },
    ...(hasLegacyDepartment
      ? [
          {
            value: model.personneMorale.department,
            label: `${model.personneMorale.department} (valeur historique)`,
          },
        ]
      : []),
    ...departements.map((department) => ({
      value: department.name,
      label: `${department.code} - ${department.name}`,
    })),
  ]);

  const regionOptions = $derived([
    { value: "", label: "Non renseignée" },
    ...(hasLegacyRegion
      ? [
          {
            value: model.personneMorale.region,
            label: `${model.personneMorale.region} (valeur historique)`,
          },
        ]
      : []),
    ...dossierRegionOptions.map((region) => ({ value: region, label: region })),
  ]);
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
    <Select
      id="edit-legal-department"
      class="fr-mt-1w w-full"
      options={departmentOptions}
      bind:value={model.personneMorale.department}
    />
  </div>
  <div class="fr-select-group w-full">
    <label class="fr-label" for="edit-legal-region">Région</label>
    <Select
      id="edit-legal-region"
      class="fr-mt-1w w-full"
      options={regionOptions}
      bind:value={model.personneMorale.region}
    />
  </div>
</div>
