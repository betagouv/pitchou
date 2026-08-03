<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import TriStateSelect from "./TriStateSelect.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  const typeOptions = ["Hirondelle", "Cigogne"];
  const hasLegacyType = $derived(!!model.type && !typeOptions.includes(model.type));
</script>

<fieldset class="fr-fieldset w-full" aria-label="Autres données du dossier" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Autres données du dossier</legend>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div class="fr-select-group w-full">
        <label class="fr-label" for="edit-type">Type de dossier</label>
        <select class="fr-select" id="edit-type" bind:value={model.type}>
          <option value="">Non renseigné</option>
          {#if hasLegacyType}
            <option value={model.type}>{model.type} (valeur historique)</option>
          {/if}
          {#each typeOptions as option (option)}<option value={option}>{option}</option>{/each}
        </select>
      </div>
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-depot-date">Date de dépôt</label>
        <DatePicker
          id="edit-depot-date"
          label="Date de dépôt"
          value={model.depotDate}
          onChange={(value) => (model.depotDate = value ?? "")}
        />
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <TriStateSelect
      id="edit-erc-planned"
      label="Mesures ERC prévues"
      value={model.mesuresErcPlanned}
      onChange={(value) => (model.mesuresErcPlanned = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-destroyed-nids">Nombre de nids détruits</label>
        <input
          class="fr-input"
          id="edit-destroyed-nids"
          type="number"
          min="0"
          step="1"
          bind:value={model.destroyedNidsCount}
        />
      </div>
      {#if ["Hirondelle", "Cigogne"].includes(model.type)}
        <div class="fr-input-group">
          <label class="fr-label" for="edit-compensated-nids">
            Nombre de nids artificiels posés en compensation
          </label>
          <input
            class="fr-input"
            id="edit-compensated-nids"
            type="number"
            min="1"
            step="1"
            required
            bind:value={model.compensatedNidsCount}
          />
        </div>
      {/if}
    </div>
  </div>
</fieldset>
