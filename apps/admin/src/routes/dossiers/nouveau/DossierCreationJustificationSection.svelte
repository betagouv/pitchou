<script lang="ts">
  import {
    motifDerogationOptions,
    requiresScientificDemandeType,
    scientifiqueDemandeTypeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";

  import SearchableSelect from "./SearchableSelect.svelte";
  import { motifDerogationGuidance, type DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();

  function toggleScientificType(value: string, checked: boolean) {
    model.scientifiqueDemandeType = checked
      ? [...model.scientifiqueDemandeType, value]
      : model.scientifiqueDemandeType.filter((selected) => selected !== value);
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="justification-title"
>
  <h2 class="fr-h2" id="justification-title">7. Justifications de la demande de dérogation</h2>

  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="no-other-solution-justification">
      Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet
      <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </label>
    <textarea
      class="fr-input w-full"
      id="no-other-solution-justification"
      rows="5"
      required
      bind:value={model.noOtherSatisfactorySolutionJustification}></textarea>
  </div>

  <div class="fr-callout fr-icon-information-line fr-mb-4w">
    <p class="fr-callout__text fr-text--bold">
      {motifDerogationGuidance(model)}
    </p>
  </div>

  <div class="fr-select-group w-full fr-mb-4w">
    <label class="fr-label" id="creation-motif-derogation-label" for="creation-motif-derogation">
      Motif de la dérogation <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </label>
    <SearchableSelect
      id="creation-motif-derogation"
      labelledBy="creation-motif-derogation-label"
      options={motifDerogationOptions.map((option) => ({ value: option, label: option }))}
      value={model.motifDerogation}
      placeholder="Sélectionnez"
      required
      onChange={(value) => (model.motifDerogation = value)}
    />
  </div>

  <div class="fr-input-group w-full fr-mb-4w">
    <label class="fr-label" for="creation-motif-justification">
      Synthèse des éléments justifiant le motif de la dérogation
      <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </label>
    <textarea
      class="fr-input w-full"
      id="creation-motif-justification"
      rows="5"
      required
      bind:value={model.motifDerogationJustification}></textarea>
  </div>

  {#if requiresScientificDemandeType(model.motifDerogation)}
    <fieldset class="fr-fieldset fr-mb-0" aria-labelledby="scientific-request-type-legend">
      <legend class="fr-fieldset__legend font-normal" id="scientific-request-type-legend">
        Recherche scientifique - Votre demande concerne : <span aria-hidden="true">*</span>
        <span class="fr-sr-only">Champ obligatoire</span>
        <span class="fr-hint-text">Vous pouvez sélectionner un ou plusieurs choix.</span>
      </legend>
      {#each scientifiqueDemandeTypeOptions as option, index (option)}
        <div class="fr-fieldset__element">
          <div class="fr-checkbox-group">
            <input
              id={`scientific-request-type-${index}`}
              type="checkbox"
              checked={model.scientifiqueDemandeType.includes(option)}
              onchange={(event) => toggleScientificType(option, event.currentTarget.checked)}
            />
            <label class="fr-label" for={`scientific-request-type-${index}`}>{option}</label>
          </div>
        </div>
      {/each}
    </fieldset>
  {/if}
</section>
