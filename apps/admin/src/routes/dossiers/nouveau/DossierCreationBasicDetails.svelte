<script lang="ts">
  import {
    aeProcedureOptions,
    especesPriseDetentionLimiteeTypeOptions,
    requiresEspecesPriseDetentionLimiteeType,
  } from "@pitchou/common/dossierFormOptions.ts";
  import { showsDestroyedNidsCount, type DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
  function toggle(values: string[], value: string, checked: boolean): string[] {
    return checked ? [...values, value] : values.filter((item) => item !== value);
  }
</script>

<div class="fr-input-group w-full fr-mb-4w">
  <label class="fr-label" for="project-description">Description synthétique du projet *</label>
  <textarea
    class="fr-input w-full"
    id="project-description"
    rows="5"
    required
    bind:value={model.description}></textarea>
</div>
<fieldset class="fr-fieldset fr-mb-4w">
  <legend class="fr-fieldset__legend font-normal"
    >Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code
    de l'environnement) ? *</legend
  >
  {#each [["oui", "Oui"], ["non", "Non"], ["unknown", "Ne sait pas encore"]] as [value, label]}
    <div class="fr-fieldset__element">
      <div class="fr-radio-group">
        <input
          id={`ae-regime-${value}`}
          type="radio"
          name="ae-regime"
          {value}
          required
          bind:group={model.aeRegime}
        />
        <label class="fr-label" for={`ae-regime-${value}`}>{label}</label>
      </div>
    </div>
  {/each}
</fieldset>
{#if model.aeRegime === "oui"}
  <fieldset class="fr-fieldset fr-mb-4w">
    <legend class="fr-fieldset__legend font-normal"
      >À quelle procédure le projet est-il soumis ? *</legend
    >
    {#each aeProcedureOptions as option, index}
      <div class="fr-fieldset__element">
        <div class="fr-checkbox-group">
          <input
            id={`ae-procedure-${index}`}
            type="checkbox"
            checked={model.aeProcedures.includes(option)}
            onchange={(event) =>
              (model.aeProcedures = toggle(
                model.aeProcedures,
                option,
                event.currentTarget.checked,
              ))}
          />
          <label class="fr-label" for={`ae-procedure-${index}`}>{option}</label>
        </div>
      </div>
    {/each}
  </fieldset>
  {#if model.aeProcedures.includes("Autre")}
    <div class="fr-input-group fr-mb-4w">
      <label class="fr-label" for="ae-other-procedure"
        >Préciser la procédure justifiant l'AE *</label
      >
      <input
        class="fr-input"
        id="ae-other-procedure"
        required
        bind:value={model.aeOtherProcedure}
      />
    </div>
  {/if}
{/if}
{#if showsDestroyedNidsCount(model)}
  <div class="fr-input-group fr-mb-4w">
    <label class="fr-label" for="destroyed-nids-count"
      >Nombre de nids d'Hirondelles à détruire *</label
    >
    <input
      class="fr-input max-w-40"
      id="destroyed-nids-count"
      type="number"
      min="1"
      step="1"
      required
      bind:value={model.destroyedNidsCount}
    />
  </div>
{/if}
{#if requiresEspecesPriseDetentionLimiteeType(model.motifDerogation)}
  <fieldset class="fr-fieldset fr-mb-4w">
    <legend class="fr-fieldset__legend font-normal"
      >Prise ou détention limité ou spécifié - Précisez *</legend
    >
    {#each especesPriseDetentionLimiteeTypeOptions as option, index}
      <div class="fr-fieldset__element">
        <div class="fr-radio-group">
          <input
            id={`limited-specimen-${index}`}
            type="radio"
            name="limited-specimen"
            value={option}
            required
            bind:group={model.especesPriseDetentionLimiteeType}
          />
          <label class="fr-label" for={`limited-specimen-${index}`}>{option}</label>
        </div>
      </div>
    {/each}
  </fieldset>
{/if}
