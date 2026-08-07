<script lang="ts">
  import { eolienMortalityActionOptions } from "@pitchou/common/dossierFormOptions.ts";
  import { showsCarcassAnalysis, type DossierCreationModel } from "./dossierCreationModel.ts";
  import DossierCreationCarcassAnalysis from "./DossierCreationCarcassAnalysis.svelte";
  let { model }: { model: DossierCreationModel } = $props();
  let input = $state<HTMLInputElement>();
  let error = $state("");
  function setFiles(files: File[]) {
    if (files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      error = "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
      return;
    }
    error = "";
    model.eolienProtocolFiles = files;
  }
  function toggle(value: string, checked: boolean) {
    model.eolienMortalityActions = checked
      ? [...model.eolienMortalityActions, value]
      : model.eolienMortalityActions.filter((item) => item !== value);
  }
  function setCount(
    field:
      | "eolienMonitoredTurbinesCount"
      | "eolienMonitoringVisitsCount"
      | "eolienWeeklyMonitoringVisitsCount",
    value: number,
  ) {
    model[field] = Number.isNaN(value) ? null : value;
  }
</script>

{#each [["eolien-monitored-turbines-count", "Nombre d'éoliennes à suivre", "eolienMonitoredTurbinesCount"], ["eolien-monitoring-visits-count", "Nombre de passages pendant le suivi", "eolienMonitoringVisitsCount"], ["eolien-weekly-monitoring-visits-count", "Nombre de passages par semaine de suivi", "eolienWeeklyMonitoringVisitsCount"]] as [id, label, field]}
  <div class="fr-input-group max-w-xl fr-mb-4w">
    <label class="fr-label" for={id}
      >{label}<span class="fr-hint-text">Ce nombre doit être positif.</span></label
    >
    <input
      class="fr-input"
      {id}
      type="number"
      min="1"
      step="1"
      value={model[field as keyof DossierCreationModel] as number | null}
      oninput={(event) =>
        setCount(field as "eolienMonitoredTurbinesCount", event.currentTarget.valueAsNumber)}
    />
  </div>
{/each}
<div class="fr-input-group w-full fr-mb-4w">
  <label class="fr-label" for="eolien-field-inventory-period">Période des inventaires terrain</label
  >
  <input
    class="fr-input"
    id="eolien-field-inventory-period"
    bind:value={model.eolienFieldInventoryPeriod}
  />
</div>
<div class="fr-upload-group fr-mb-4w">
  <label class="fr-label" for="eolien-protocol-files"
    >Pièces jointes décrivant précisément le protocole qui sera mis en place<span
      class="fr-hint-text">Taille totale maximale : 65 Mo. Plusieurs fichiers possibles</span
    ></label
  >
  <div
    class="border-2 border-dashed border-[color:var(--border-default-grey)] fr-p-4w text-center"
    role="group"
    aria-label="Déposer les pièces décrivant le protocole"
    ondragover={(event) => event.preventDefault()}
    ondrop={(event) => {
      event.preventDefault();
      if (event.dataTransfer) setFiles([...event.dataTransfer.files]);
    }}
  >
    <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
    <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
    <span class="fr-mx-2w">OU</span>
    <button class="fr-btn fr-btn--secondary" type="button" onclick={() => input?.click()}
      >Choisir des fichiers</button
    >
    <input
      class="fr-sr-only"
      id="eolien-protocol-files"
      type="file"
      multiple
      bind:this={input}
      onchange={(event) => setFiles([...(event.currentTarget.files ?? [])])}
    />
  </div>
  {#if error}<p class="fr-error-text" role="alert">{error}</p>{/if}
  {#if model.eolienProtocolFiles.length >= 1}<ul class="fr-mt-2w">
      {#each model.eolienProtocolFiles as file (file.name)}<li>{file.name}</li>{/each}
    </ul>{/if}
</div>
<fieldset class="fr-fieldset fr-mb-0">
  <legend class="fr-fieldset__legend font-normal"
    >Suivi de mortalité - Votre demande concerne :<span class="fr-hint-text"
      >Vous pouvez sélectionner un ou plusieurs choix.</span
    ></legend
  >
  {#each eolienMortalityActionOptions as option, index}
    <div class="fr-fieldset__element">
      <div class="fr-checkbox-group">
        <input
          id={`eolien-mortality-action-${index}`}
          type="checkbox"
          checked={model.eolienMortalityActions.includes(option)}
          onchange={(event) => toggle(option, event.currentTarget.checked)}
        />
        <label class="fr-label" for={`eolien-mortality-action-${index}`}>{option}</label>
      </div>
    </div>
  {/each}
</fieldset>
{#if showsCarcassAnalysis(model)}<DossierCreationCarcassAnalysis {model} />{/if}
