<script lang="ts">
  import type { Snippet } from "svelte";

  import {
    aeProcedureOptions,
    especesPriseDetentionLimiteeTypeOptions,
    requiresEspecesPriseDetentionLimiteeType,
    scientifiqueDemandePurposeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";

  import {
    showsDestroyedNidsCount,
    showsPreviousAssessment,
    showsScientificPurposes,
    showsDerogationDuration,
    showsOperationDates,
    showsWindFarmDetails,
    showsCompleteDossierFiles,
    showsNoDerogationArgumentFiles,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";
  import DossierCreationOperationDetailsSection from "./DossierCreationOperationDetailsSection.svelte";
  import DossierCreationIntervenantsSection from "./DossierCreationIntervenantsSection.svelte";
  import DossierCreationFileUpload from "./DossierCreationFileUpload.svelte";

  let {
    model,
    existingAttachments,
  }: { model: DossierCreationModel; existingAttachments?: Snippet } = $props();
  let windFarmPlanInput = $state<HTMLInputElement>();
  let windFarmPlanError = $state("");

  function toggle(values: string[], value: string, checked: boolean): string[] {
    return checked ? [...values, value] : values.filter((item) => item !== value);
  }

  const files = (event: Event) => [...((event.currentTarget as HTMLInputElement).files ?? [])];

  function setWindFarmPlanFiles(newFiles: File[]) {
    if (newFiles.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      windFarmPlanError = "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
      return;
    }
    windFarmPlanError = "";
    model.windFarmPlanFiles = newFiles;
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="details-title"
>
  <h2 class="fr-h2" id="details-title">8. Détails du projet</h2>

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
      >Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du
      Code de l'environnement) ? *</legend
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
          /><label class="fr-label" for={`ae-regime-${value}`}>{label}</label>
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
            /><label class="fr-label" for={`ae-procedure-${index}`}>{option}</label>
          </div>
        </div>
      {/each}
    </fieldset>
    {#if model.aeProcedures.includes("Autre")}
      <div class="fr-input-group fr-mb-4w">
        <label class="fr-label" for="ae-other-procedure"
          >Préciser la procédure justifiant l'AE *</label
        ><input
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
      ><input
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
            /><label class="fr-label" for={`limited-specimen-${index}`}>{option}</label>
          </div>
        </div>
      {/each}
    </fieldset>
  {/if}

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
            /><label class="fr-label" for={`scientific-purpose-${index}`}>{option}</label>
          </div>
        </div>
      {/each}
    </fieldset>
    <div class="fr-upload-group fr-mb-4w">
      <label class="fr-label" for="purpose-files"
        >Joindre les pièces justifiant de la finalité de la demande</label
      ><input
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
            /><label class="fr-label" for={`previous-assessment-${value}`}>{label}</label>
          </div>
        </div>
      {/each}
    </fieldset>
    {#if model.scientifiquePreviousAssessment === "oui"}
      <div class="fr-upload-group fr-mb-4w">
        <label class="fr-label" for="previous-assessment-files"
          >Joindre le bilan des opérations antérieures *</label
        ><input
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

  {#if model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité"}
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
            /><label class="fr-label" for={`mortality-measures-${value}`}>{label}</label>
          </div>
        </div>
      {/each}
    </fieldset>
    {#if model.scientifiqueMortalityMeasuresTaken === "oui"}
      <div class="fr-input-group fr-mb-4w">
        <label class="fr-label" for="mortality-measures-details">Précisez ces mesures :</label
        ><textarea
          class="fr-input"
          id="mortality-measures-details"
          rows="4"
          bind:value={model.scientifiqueMortalityMeasuresDetails}></textarea>
      </div>
      <div class="fr-upload-group">
        <label class="fr-label" for="mortality-measure-files"
          >Ajoutez un fichier décrivant ces mesures complémentaires :</label
        ><input
          class="fr-upload"
          id="mortality-measure-files"
          type="file"
          multiple
          onchange={(event) => (model.mortalityMeasureFiles = files(event))}
        />
      </div>
    {/if}
  {/if}

  {#if showsWindFarmDetails(model)}
    <section
      class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
      aria-labelledby="wind-farm-title"
    >
      <h3 class="fr-h3" id="wind-farm-title">8.1. Description du parc éolien concerné</h3>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-commissioning-year"
          >Année de mise en service<span class="fr-hint-text">Ce nombre doit être positif.</span
          ></label
        >
        <input
          class="fr-input"
          id="eolien-commissioning-year"
          type="number"
          min="1"
          step="1"
          bind:value={model.eolienCommissioningYear}
        />
      </div>
      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-turbines-count"
          >Nombre d'éoliennes<span class="fr-hint-text">Ce nombre doit être positif.</span></label
        >
        <input
          class="fr-input"
          id="eolien-turbines-count"
          type="number"
          min="1"
          step="1"
          bind:value={model.eolienTurbinesCount}
        />
      </div>
      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-tip-height"
          >Hauteur totale bout de pale (m)<span class="fr-hint-text"
            >Format attendu : De 1 à 3 décimales après le point. Exemple: 3.141</span
          ><span class="fr-hint-text">Ce nombre doit être positif.</span></label
        >
        <input
          class="fr-input"
          id="eolien-tip-height"
          type="number"
          min="0.001"
          step="0.001"
          bind:value={model.eolienTipHeight}
        />
      </div>
      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-rotor-diameter"
          >Diamètre du rotor (m)<span class="fr-hint-text"
            >Format attendu : De 1 à 3 décimales après le point. Exemple: 3.141</span
          ><span class="fr-hint-text">Ce nombre doit être positif.</span></label
        >
        <input
          class="fr-input"
          id="eolien-rotor-diameter"
          type="number"
          min="0.001"
          step="0.001"
          bind:value={model.eolienRotorDiameter}
        />
      </div>
      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-ground-clearance"
          >Garde au sol (m)<span class="fr-hint-text"
            >Format attendu : De 1 à 3 décimales après le point. Exemple: 3.141</span
          ><span class="fr-hint-text">Ce nombre doit être positif.</span></label
        >
        <input
          class="fr-input"
          id="eolien-ground-clearance"
          type="number"
          min="0.001"
          step="0.001"
          bind:value={model.eolienGroundClearance}
        />
      </div>

      <div class="fr-upload-group">
        <label class="fr-label" for="wind-farm-plan-files"
          >Plan des installations<span class="fr-hint-text"
            >Taille totale maximale : 65 Mo. Plusieurs fichiers possibles</span
          ></label
        >
        <div
          class="border-2 border-dashed border-[color:var(--border-default-grey)] fr-p-4w text-center"
          role="group"
          aria-label="Déposer le plan des installations"
          ondragover={(event) => event.preventDefault()}
          ondrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer) setWindFarmPlanFiles([...event.dataTransfer.files]);
          }}
        >
          <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
          <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
          <span class="fr-mx-2w">OU</span>
          <button
            class="fr-btn fr-btn--secondary"
            type="button"
            onclick={() => windFarmPlanInput?.click()}>Choisir des fichiers</button
          >
          <input
            class="fr-sr-only"
            id="wind-farm-plan-files"
            type="file"
            multiple
            bind:this={windFarmPlanInput}
            onchange={(event) => setWindFarmPlanFiles(files(event))}
          />
        </div>
        {#if windFarmPlanError}<p class="fr-error-text" role="alert">{windFarmPlanError}</p>{/if}
        {#if model.windFarmPlanFiles.length >= 1}
          <ul class="fr-mt-2w">
            {#each model.windFarmPlanFiles as file (file.name)}<li>{file.name}</li>{/each}
          </ul>
        {/if}
      </div>
    </section>
  {/if}

  {#if showsOperationDates(model)}
    <section
      class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
      aria-labelledby="operation-period-title"
    >
      <h3 class="fr-h3" id="operation-period-title">8.2. Période de l'opération</h3>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="intervention-start-date"
          >Date de début d’intervention *<span class="fr-hint-text"
            >La date de début d'intervention correspond à la date de début des travaux (y compris
            travaux préparatoires), de début du suivi dans le cas des suivis scientifiques...</span
          ></label
        >
        <input
          class="fr-input"
          id="intervention-start-date"
          type="date"
          required
          bind:value={model.interventionStartDate}
        />
      </div>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="intervention-end-date"
          >Date de fin d’intervention *<span class="fr-hint-text"
            >La date de fin d'intervention correspond à la date de fin des inventaires, des travaux
            avant mise en service...</span
          ></label
        >
        <input
          class="fr-input"
          id="intervention-end-date"
          type="date"
          required
          min={model.interventionStartDate || undefined}
          bind:value={model.interventionEndDate}
        />
      </div>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="commissioning-date"
          >Date de mise en service<span class="fr-hint-text">Date de début d'exploitation</span
          ></label
        >
        <input
          class="fr-input"
          id="commissioning-date"
          type="date"
          bind:value={model.commissioningDate}
        />
      </div>

      {#if showsDerogationDuration(model)}
        <div class="fr-input-group max-w-xl">
          <label class="fr-label" for="intervention-duration"
            >Durée de la dérogation (en années)<span class="fr-hint-text"
              >Ce champ est notamment à remplir pour les dérogations pluriannuelles ou pour indiquer
              la durée d'exploitation de l'aménagement réalisé (en années).</span
            ><span class="fr-hint-text">Ce nombre doit être positif.</span></label
          >
          <input
            class="fr-input"
            id="intervention-duration"
            type="number"
            min="0.001"
            step="0.001"
            bind:value={model.interventionDuration}
          />
        </div>
      {/if}
    </section>
  {/if}
  <DossierCreationOperationDetailsSection {model} />
  <DossierCreationIntervenantsSection {model} />
  <section
    class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
    aria-labelledby="attachments-title"
  >
    <h3 class="fr-h3" id="attachments-title">8.5. Pièces jointes</h3>

    {#if showsCompleteDossierFiles(model)}
      <DossierCreationFileUpload
        id="complete-dossier-files"
        label="Dépot du dossier complet de demande de dérogation"
        description={'Si votre dossier fait plus de 65 Mo, utilisez https://francetransfert.numerique.gouv.fr/upload pour générer un lien que vous indiquerez dans le champ "Description synthétique du projet".'}
        required
        bind:uploadedFiles={model.completeDossierFiles}
      />
    {/if}

    {#if showsNoDerogationArgumentFiles(model)}
      <DossierCreationFileUpload
        id="no-derogation-argument-files"
        label="Déposez ici l'argumentaire précis vous ayant permis de conclure à l'absence de risque suffisamment caractérisé pour les espèces protégées et leurs habitats."
        description="Cet argumentaire doit notamment détailler les points suivants :\n- fournir ici l'état des lieux écologique, ainsi que les protocoles d'inventaires utilisés ;\n- décrire les mesures d'évitement et de réduction prévues ;\n- caractériser le risque résiduel d'atteinte à l'état de conservation des espèces protégées."
        required
        bind:uploadedFiles={model.noDerogationArgumentFiles}
      />
    {/if}

    <DossierCreationFileUpload
      id="supplemental-files"
      label="Ajoutez ici les pièces jointes supplémentaires nécessaires à votre dossier"
      required
      bind:uploadedFiles={model.supplementalFiles}
    />
    {@render existingAttachments?.()}
  </section>
</section>
