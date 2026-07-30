<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel; disabled: boolean; complete: boolean };
  let { model, disabled, complete }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Période de l'opération" {disabled}>
  <legend class="fr-fieldset__legend fr-h4">
    {complete ? "5.1. Période de l'opération" : "0.1. Période de l'opération"}
  </legend>
  <div class="fr-fieldset__element">
    <div class="flex flex-col gap-6 w-full">
      <div class="fr-input-group min-w-[14rem] max-w-3xl">
        <label class="fr-label" for="edit-intervention-start">
          Date de début d'intervention
          <span class="fr-hint-text">Format attendu : MM/JJ/AAAA.</span>
          <span class="fr-hint-text">
            La date de début d'intervention correspond à la date de début des travaux, y compris les
            travaux préparatoires, ou au début du suivi scientifique.
          </span>
        </label>
        <DatePicker
          id="edit-intervention-start"
          label="Date de début d'intervention"
          value={model.interventionStartDate}
          max={model.interventionEndDate || undefined}
          onChange={(value) => (model.interventionStartDate = value ?? "")}
        />
      </div>
      <div class="fr-input-group min-w-[14rem] max-w-3xl">
        <label class="fr-label" for="edit-intervention-end">
          Date de fin d'intervention
          <span class="fr-hint-text">Format attendu : MM/JJ/AAAA.</span>
          <span class="fr-hint-text">
            La date de fin d'intervention correspond à la fin des inventaires ou des travaux avant
            mise en service.
          </span>
        </label>
        <DatePicker
          id="edit-intervention-end"
          label="Date de fin d'intervention"
          value={model.interventionEndDate}
          min={model.interventionStartDate || undefined}
          onChange={(value) => (model.interventionEndDate = value ?? "")}
        />
      </div>
      {#if complete}
        <div class="fr-input-group min-w-[14rem] max-w-3xl">
          <label class="fr-label" for="edit-commissioning-date">
            Date de mise en service
            <span class="fr-hint-text">Format attendu : MM/JJ/AAAA.</span>
            <span class="fr-hint-text">Date de début d'exploitation.</span>
          </label>
          <DatePicker
            id="edit-commissioning-date"
            label="Date de mise en service"
            value={model.commissioningDate}
            onChange={(value) => (model.commissioningDate = value ?? "")}
          />
        </div>
        <div class="fr-input-group min-w-[14rem] max-w-3xl">
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
      {/if}
    </div>
  </div>
</fieldset>
