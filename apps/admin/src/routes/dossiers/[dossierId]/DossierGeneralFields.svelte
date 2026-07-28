<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { dossierMainActiviteOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  const typeOptions = ["Hirondelle", "Cigogne"];
  const hasLegacyActivity = $derived(
    !!model.mainActivite && !dossierMainActiviteOptions.includes(model.mainActivite as never),
  );
  const hasLegacyType = $derived(!!model.type && !typeOptions.includes(model.type));
</script>

<fieldset class="fr-fieldset w-full" aria-label="Informations générales" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Informations générales</legend>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-name">Nom du dossier</label>
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
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-description">Description du projet</label>
      <textarea
        class="fr-input w-full"
        id="edit-description"
        rows="4"
        bind:value={model.description}></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div class="fr-select-group w-full">
        <label class="fr-label" for="edit-main-activite">Activité principale</label>
        <select class="fr-select" id="edit-main-activite" bind:value={model.mainActivite}>
          <option value="">Non renseignée</option>
          {#if hasLegacyActivity}
            <option value={model.mainActivite}>{model.mainActivite} (valeur historique)</option>
          {/if}
          {#each dossierMainActiviteOptions as option (option)}
            <option value={option}>{option}</option>
          {/each}
        </select>
      </div>
      <div class="fr-select-group w-full">
        <label class="fr-label" for="edit-type">Type de dossier</label>
        <select class="fr-select" id="edit-type" bind:value={model.type}>
          <option value="">Non renseigné</option>
          {#if hasLegacyType}
            <option value={model.type}>{model.type} (valeur historique)</option>
          {/if}
          {#each typeOptions as option (option)}
            <option value={option}>{option}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-depot-date">Date de dépôt</label>
        <DatePicker
          id="edit-depot-date"
          label="Date de dépôt"
          value={model.depotDate}
          onChange={(value) => (model.depotDate = value ?? "")}
        />
      </div>
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-intervention-start">Début d'intervention</label>
        <DatePicker
          id="edit-intervention-start"
          label="Début d'intervention"
          value={model.interventionStartDate}
          max={model.interventionEndDate || undefined}
          onChange={(value) => (model.interventionStartDate = value ?? "")}
        />
      </div>
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-intervention-end">Fin d'intervention</label>
        <DatePicker
          id="edit-intervention-end"
          label="Fin d'intervention"
          value={model.interventionEndDate}
          min={model.interventionStartDate || undefined}
          onChange={(value) => (model.interventionEndDate = value ?? "")}
        />
      </div>
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-commissioning-date">Mise en service</label>
        <DatePicker
          id="edit-commissioning-date"
          label="Date de mise en service"
          value={model.commissioningDate}
          onChange={(value) => (model.commissioningDate = value ?? "")}
        />
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-input-group max-w-sm">
      <label class="fr-label" for="edit-intervention-duration">
        Durée de la dérogation <span class="fr-hint-text">En années</span>
      </label>
      <input
        class="fr-input"
        id="edit-intervention-duration"
        type="number"
        min="0"
        step="1"
        bind:value={model.interventionDuration}
      />
    </div>
  </div>
</fieldset>
