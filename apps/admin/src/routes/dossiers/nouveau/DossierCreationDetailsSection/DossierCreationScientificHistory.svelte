<script lang="ts">
  import { scientifiqueDemandePurposeOptions } from "@pitchou/common/dossierFormOptions.ts";
  import {
    showsPreviousAssessment,
    showsScientificPurposes,
    showsWindFarmDetails,
    type DossierCreationModel,
  } from "../dossierCreationModel.ts";
  let { model }: { model: DossierCreationModel } = $props();
  const files = (event: Event) => [...((event.currentTarget as HTMLInputElement).files ?? [])];
  function toggle(values: string[], value: string, checked: boolean): string[] {
    return checked ? [...values, value] : values.filter((item) => item !== value);
  }
</script>

{#if showsScientificPurposes(model)}
  <fieldset class="fr-fieldset fr-mb-4w">
    <legend class="fr-fieldset__legend font-normal"
      >Captures/Relâchers/Prélèvement - Finalité(s) de la demande</legend
    >
    <p class="fr-hint-text">Vous pouvez sélectionner un ou plusieurs choix.</p>
    {#each scientifiqueDemandePurposeOptions as option, index}
      <div class="fr-fieldset__element">
        <div class="fr-checkbox-group">
          <input
            id={`scientific-purpose-${index}`}
            type="checkbox"
            checked={model.scientifiqueDemandePurposes.includes(option)}
            onchange={(event) =>
              (model.scientifiqueDemandePurposes = toggle(
                model.scientifiqueDemandePurposes,
                option,
                event.currentTarget.checked,
              ))}
          />
          <label class="fr-label" for={`scientific-purpose-${index}`}>{option}</label>
        </div>
      </div>
    {/each}
  </fieldset>
  <div class="fr-upload-group fr-mb-4w">
    <label class="fr-label" for="purpose-files"
      >Joindre les pièces justifiant de la finalité de la demande</label
    >
    <input
      class="fr-upload"
      id="purpose-files"
      type="file"
      multiple
      onchange={(event) => (model.purposeFiles = files(event))}
    />
  </div>
{/if}
{#if showsPreviousAssessment(model)}
  <fieldset class="fr-fieldset fr-mb-4w">
    <legend class="fr-fieldset__legend font-normal"
      >Cette demande concerne un programme de suivi déjà existant *</legend
    >
    {#each [["oui", "Oui"], ["non", "Non"]] as [value, label]}
      <div class="fr-fieldset__element fr-fieldset__element--inline">
        <div class="fr-radio-group">
          <input
            id={`previous-assessment-${value}`}
            type="radio"
            name="previous-assessment"
            {value}
            required
            bind:group={model.scientifiquePreviousAssessment}
          />
          <label class="fr-label" for={`previous-assessment-${value}`}>{label}</label>
        </div>
      </div>
    {/each}
  </fieldset>
  {#if model.scientifiquePreviousAssessment === "oui"}
    <div class="fr-upload-group fr-mb-4w">
      <label class="fr-label" for="previous-assessment-files"
        >Joindre le bilan des opérations antérieures *</label
      >
      <input
        class="fr-upload"
        id="previous-assessment-files"
        type="file"
        multiple
        required
        onchange={(event) => (model.previousAssessmentFiles = files(event))}
      />
    </div>
  {/if}
{/if}
{#if showsWindFarmDetails(model)}
  <fieldset class="fr-fieldset fr-mb-4w">
    <legend class="fr-fieldset__legend font-normal"
      >En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ? *</legend
    >
    {#each [["oui", "Oui"], ["non", "Non"]] as [value, label]}
      <div class="fr-fieldset__element fr-fieldset__element--inline">
        <div class="fr-radio-group">
          <input
            id={`mortality-measures-${value}`}
            type="radio"
            name="mortality-measures"
            {value}
            required
            bind:group={model.scientifiqueMortalityMeasuresTaken}
          />
          <label class="fr-label" for={`mortality-measures-${value}`}>{label}</label>
        </div>
      </div>
    {/each}
  </fieldset>
  {#if model.scientifiqueMortalityMeasuresTaken === "oui"}
    <div class="fr-input-group fr-mb-4w">
      <label class="fr-label" for="mortality-measures-details">Précisez ces mesures :</label>
      <textarea
        class="fr-input"
        id="mortality-measures-details"
        rows="4"
        bind:value={model.scientifiqueMortalityMeasuresDetails}></textarea>
    </div>
    <div class="fr-upload-group">
      <label class="fr-label" for="mortality-measure-files"
        >Ajoutez un fichier décrivant ces mesures complémentaires :</label
      >
      <input
        class="fr-upload"
        id="mortality-measure-files"
        type="file"
        multiple
        onchange={(event) => (model.mortalityMeasureFiles = files(event))}
      />
    </div>
  {/if}
{/if}
