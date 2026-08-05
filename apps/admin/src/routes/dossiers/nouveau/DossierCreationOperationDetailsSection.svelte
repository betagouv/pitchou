<script lang="ts">
  import {
    eolienMortalityActionOptions,
    scientifiqueCaptureModeOptions,
    scientifiqueDemandeTypeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";

  import {
    showsCarcassAnalysis,
    showsOperationDetails,
    showsScientificCaptureDetails,
    showsWindFarmDetails,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";
  import AddressAutocomplete from "./AddressAutocomplete.svelte";

  let { model }: { model: DossierCreationModel } = $props();
  let protocolFileInput = $state<HTMLInputElement>();
  let protocolFileError = $state("");

  function setProtocolFiles(files: File[]) {
    if (files.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      protocolFileError = "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
      return;
    }
    protocolFileError = "";
    model.eolienProtocolFiles = files;
  }

  function toggleMortalityAction(value: string, checked: boolean) {
    model.eolienMortalityActions = checked
      ? [...model.eolienMortalityActions, value]
      : model.eolienMortalityActions.filter((item) => item !== value);
  }

  function toggleCaptureMode(value: string, checked: boolean) {
    model.scientifiqueCaptureModes = checked
      ? [...model.scientifiqueCaptureModes, value]
      : model.scientifiqueCaptureModes.filter((item) => item !== value);
  }

  function toggleManualCarcassAddress(checked: boolean) {
    model.eolienCarcassAddressManual = checked;
    if (checked) {
      requestAnimationFrame(() =>
        document.getElementById("carcass-examination-address-manual")?.focus(),
      );
    }
  }

  const otherCaptureMode = "Autre moyen de capture (préciser)";
</script>

{#if showsOperationDetails(model)}
  <section
    class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
    aria-labelledby="operation-details-title"
  >
    <h3 class="fr-h3" id="operation-details-title">8.3. Modalités de l'opération</h3>

    <div class="fr-input-group w-full fr-mb-4w">
      <label class="fr-label" for="scientific-protocol-description"
        >Description du protocole de suivi</label
      >
      <textarea
        class="fr-input w-full"
        id="scientific-protocol-description"
        rows="5"
        bind:value={model.scientifiqueSuiviProtocolDescription}></textarea>
    </div>

    {#if showsWindFarmDetails(model)}
      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-monitored-turbines-count"
          >Nombre d'éoliennes à suivre<span class="fr-hint-text">Ce nombre doit être positif.</span
          ></label
        >
        <input
          class="fr-input"
          id="eolien-monitored-turbines-count"
          type="number"
          min="1"
          step="1"
          bind:value={model.eolienMonitoredTurbinesCount}
        />
      </div>

      <div class="fr-input-group w-full fr-mb-4w">
        <label class="fr-label" for="eolien-field-inventory-period"
          >Période des inventaires terrain</label
        >
        <input
          class="fr-input"
          id="eolien-field-inventory-period"
          bind:value={model.eolienFieldInventoryPeriod}
        />
      </div>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-monitoring-visits-count"
          >Nombre de passages pendant le suivi<span class="fr-hint-text"
            >Ce nombre doit être positif.</span
          ></label
        >
        <input
          class="fr-input"
          id="eolien-monitoring-visits-count"
          type="number"
          min="1"
          step="1"
          bind:value={model.eolienMonitoringVisitsCount}
        />
      </div>

      <div class="fr-input-group max-w-xl fr-mb-4w">
        <label class="fr-label" for="eolien-weekly-monitoring-visits-count"
          >Nombre de passages par semaine de suivi<span class="fr-hint-text"
            >Ce nombre doit être positif.</span
          ></label
        >
        <input
          class="fr-input"
          id="eolien-weekly-monitoring-visits-count"
          type="number"
          min="1"
          step="1"
          bind:value={model.eolienWeeklyMonitoringVisitsCount}
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
            if (event.dataTransfer) setProtocolFiles([...event.dataTransfer.files]);
          }}
        >
          <span class="fr-icon-upload-line fr-icon--lg" aria-hidden="true"></span>
          <p class="fr-mb-2w">Faites glisser et déposez vos fichiers ici</p>
          <span class="fr-mx-2w">OU</span>
          <button
            class="fr-btn fr-btn--secondary"
            type="button"
            onclick={() => protocolFileInput?.click()}>Choisir des fichiers</button
          >
          <input
            class="fr-sr-only"
            id="eolien-protocol-files"
            type="file"
            multiple
            bind:this={protocolFileInput}
            onchange={(event) => setProtocolFiles([...(event.currentTarget.files ?? [])])}
          />
        </div>
        {#if protocolFileError}<p class="fr-error-text" role="alert">{protocolFileError}</p>{/if}
        {#if model.eolienProtocolFiles.length >= 1}
          <ul class="fr-mt-2w">
            {#each model.eolienProtocolFiles as file (file.name)}<li>{file.name}</li>{/each}
          </ul>
        {/if}
      </div>

      <fieldset class="fr-fieldset fr-mb-0">
        <legend class="fr-fieldset__legend font-normal">
          Suivi de mortalité - Votre demande concerne :
          <span class="fr-hint-text">Vous pouvez sélectionner un ou plusieurs choix.</span>
        </legend>
        {#each eolienMortalityActionOptions as option, index}
          <div class="fr-fieldset__element">
            <div class="fr-checkbox-group">
              <input
                id={`eolien-mortality-action-${index}`}
                type="checkbox"
                checked={model.eolienMortalityActions.includes(option)}
                onchange={(event) => toggleMortalityAction(option, event.currentTarget.checked)}
              />
              <label class="fr-label" for={`eolien-mortality-action-${index}`}>{option}</label>
            </div>
          </div>
        {/each}
      </fieldset>

      {#if showsCarcassAnalysis(model)}
        <section
          class="border-t border-[color:var(--border-default-grey)] fr-pt-4w fr-mt-5w"
          aria-labelledby="carcass-analysis-title"
        >
          <h4 class="fr-h4" id="carcass-analysis-title">
            8.3.1. Précisions sur le transport des cadavres pour analyse au bureau
          </h4>
          <div class="fr-input-group w-full fr-mb-4w">
            <label class="fr-label" for="carcass-collection-method"
              >Description du mode de collecte sur le terrain</label
            >
            <textarea
              class="fr-input"
              id="carcass-collection-method"
              rows="5"
              bind:value={model.eolienCarcassCollectionMethod}></textarea>
          </div>
          <div class="fr-input-group w-full fr-mb-4w">
            <label class="fr-label" for="carcass-preservation-method">Méthode de conservation</label
            >
            <textarea
              class="fr-input"
              id="carcass-preservation-method"
              rows="5"
              bind:value={model.eolienCarcassPreservationMethod}></textarea>
          </div>
          <div class="fr-mb-2w">
            {#if model.eolienCarcassAddressManual}
              <div class="fr-input-group">
                <label class="fr-label" for="carcass-examination-address-manual"
                  >Adresse des locaux où seront examinés les cadavres</label
                >
                <input
                  class="fr-input"
                  id="carcass-examination-address-manual"
                  bind:value={model.eolienCarcassExaminationAddress}
                />
              </div>
            {:else}
              <AddressAutocomplete
                id="carcass-examination-address"
                label="Adresse des locaux où seront examinés les cadavres"
                hint="Saisissez une adresse, une voie, un lieu-dit ou une commune. Exemple : 11 rue Réaumur, Paris"
                value={model.eolienCarcassExaminationAddress}
                onChange={(value) => (model.eolienCarcassExaminationAddress = value)}
              />
            {/if}
          </div>
          <div class="fr-checkbox-group">
            <input
              id="carcass-address-manual"
              type="checkbox"
              checked={model.eolienCarcassAddressManual}
              onchange={(event) => toggleManualCarcassAddress(event.currentTarget.checked)}
            />
            <label class="fr-label" for="carcass-address-manual"
              >Je ne trouve pas mon adresse dans les suggestions</label
            >
          </div>
        </section>
      {/if}
    {/if}

    {#if showsScientificCaptureDetails(model)}
      <fieldset class="fr-fieldset fr-mt-5w fr-mb-4w">
        <legend class="fr-fieldset__legend font-normal">
          En cas de nécessité de capture d'individus, précisez le mode de capture
          <span class="fr-hint-text">Vous pouvez sélectionner un ou plusieurs choix.</span>
        </legend>
        {#each [...scientifiqueCaptureModeOptions, otherCaptureMode] as option, index}
          <div class="fr-fieldset__element">
            <div class="fr-checkbox-group">
              <input
                id={`scientific-capture-mode-${index}`}
                type="checkbox"
                checked={model.scientifiqueCaptureModes.includes(option)}
                onchange={(event) => toggleCaptureMode(option, event.currentTarget.checked)}
              />
              <label class="fr-label" for={`scientific-capture-mode-${index}`}>{option}</label>
            </div>
          </div>
        {/each}
      </fieldset>

      {#if model.scientifiqueCaptureModes.includes(otherCaptureMode)}
        <div class="fr-input-group w-full fr-mb-4w">
          <label class="fr-label" for="scientific-other-capture-mode"
            >Préciser le(s) autre(s) moyen(s) de capture</label
          >
          <textarea
            class="fr-input"
            id="scientific-other-capture-mode"
            rows="4"
            bind:value={model.scientifiqueOtherCaptureMode}></textarea>
        </div>
      {/if}

      <fieldset class="fr-fieldset fr-mb-4w">
        <legend class="fr-fieldset__legend font-normal"
          >Utilisez-vous des sources lumineuses ?</legend
        >
        {#each [["oui", "Oui"], ["non", "Non"]] as [value, label]}
          <div class="fr-fieldset__element fr-fieldset__element--inline">
            <div class="fr-radio-group">
              <input
                id={`scientific-light-sources-${value}`}
                type="radio"
                name="scientific-light-sources"
                {value}
                bind:group={model.scientifiqueUsesLightSources}
              />
              <label class="fr-label" for={`scientific-light-sources-${value}`}>{label}</label>
            </div>
          </div>
        {/each}
      </fieldset>

      {#if model.scientifiqueUsesLightSources === "oui"}
        <div class="fr-input-group w-full fr-mb-4w">
          <label class="fr-label" for="scientific-light-source-conditions"
            >Précisez les modalités de l'utilisation des sources lumineuses</label
          >
          <textarea
            class="fr-input"
            id="scientific-light-source-conditions"
            rows="4"
            bind:value={model.scientifiqueLightSourceConditions}></textarea>
        </div>
      {/if}

      {#if model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[1])}
        <div class="fr-input-group w-full fr-mb-4w">
          <label class="fr-label" for="scientific-marking-conditions"
            >Précisez les modalités de marquage pour chaque taxon</label
          >
          <textarea
            class="fr-input"
            id="scientific-marking-conditions"
            rows="4"
            bind:value={model.scientifiqueMarkingConditions}></textarea>
        </div>
      {/if}

      {#if model.scientifiqueDemandeType.includes(scientifiqueDemandeTypeOptions[2])}
        <div class="fr-input-group w-full">
          <label class="fr-label" for="scientific-transport-conditions"
            >Précisez les modalités de transport et la destination concernant la collecte de
            matériel biologique</label
          >
          <textarea
            class="fr-input"
            id="scientific-transport-conditions"
            rows="4"
            bind:value={model.scientifiqueTransportConditions}></textarea>
        </div>
      {/if}
    {/if}
  </section>
{/if}
