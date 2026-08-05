<script lang="ts">
  import MultiSelectFilter, { type FilterOption } from "@pitchou/ui/MultiSelectFilter.svelte";
  import {
    scientifiqueDemandePurposeOptions,
    scientifiqueDemandeTypeOptions,
  } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import TriStateSelect from "./TriStateSelect.svelte";
  import ScientificCaptureModes from "./ScientificCaptureModes.svelte";
  import ScientificIntervenants from "./ScientificIntervenants.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  function optionsWithLegacy(options: readonly string[], selected: string[]): FilterOption[] {
    const known = new Set(options);
    return [
      ...options.map((value) => ({ value, label: value })),
      ...selected
        .filter((value) => !known.has(value))
        .map((value) => ({ value, label: `${value} (valeur historique)` })),
    ];
  }

  const demandeTypeOptions = $derived(
    optionsWithLegacy(scientifiqueDemandeTypeOptions, model.scientifiqueDemandeType),
  );
  const purposeOptions = $derived(
    optionsWithLegacy(scientifiqueDemandePurposeOptions, model.scientifiqueDemandePurposes),
  );
</script>

<fieldset class="fr-fieldset w-full" aria-label="Demande scientifique" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Demande scientifique</legend>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-scientifique-demande-type">Opérations demandées</label>
      <MultiSelectFilter
        id="edit-scientifique-demande-type"
        label="Opérations demandées"
        allLabel="Aucune opération"
        options={demandeTypeOptions}
        selected={model.scientifiqueDemandeType}
        onChange={(value) => (model.scientifiqueDemandeType = value)}
      />
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-scientifique-purposes">Finalités de la demande</label>
      <MultiSelectFilter
        id="edit-scientifique-purposes"
        label="Finalités de la demande"
        allLabel="Aucune finalité"
        options={purposeOptions}
        selected={model.scientifiqueDemandePurposes}
        onChange={(value) => (model.scientifiqueDemandePurposes = value)}
      />
    </div>
  </div>
  <div class="fr-fieldset__element">
    <TriStateSelect
      id="edit-scientifique-previous"
      label="Programme de suivi déjà existant"
      value={model.scientifiquePreviousAssessment}
      onChange={(value) => (model.scientifiquePreviousAssessment = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-scientifique-protocol"
        >Description du protocole de suivi</label
      >
      <textarea
        class="fr-input"
        id="edit-scientifique-protocol"
        rows="4"
        bind:value={model.scientifiqueSuiviProtocolDescription}></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <ScientificCaptureModes
      value={model.scientifiqueCaptureMode}
      onChange={(value) => (model.scientifiqueCaptureMode = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-scientifique-light"
          >Conditions d'utilisation des sources lumineuses</label
        ><textarea
          class="fr-input"
          id="edit-scientifique-light"
          rows="3"
          bind:value={model.scientifiqueLightSourceConditions}></textarea>
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="edit-scientifique-marking">Conditions de marquage</label
        ><textarea
          class="fr-input"
          id="edit-scientifique-marking"
          rows="3"
          bind:value={model.scientifiqueMarkingConditions}></textarea>
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="edit-scientifique-transport">Conditions de transport</label
        ><textarea
          class="fr-input"
          id="edit-scientifique-transport"
          rows="3"
          bind:value={model.scientifiqueTransportConditions}></textarea>
      </div>
      <div class="fr-input-group">
        <label class="fr-label" for="edit-scientifique-perimeter">Périmètre d'intervention</label
        ><textarea
          class="fr-input"
          id="edit-scientifique-perimeter"
          rows="3"
          bind:value={model.scientifiqueInterventionPerimeter}></textarea>
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <ScientificIntervenants
      value={model.scientifiqueIntervenants}
      onChange={(value) => (model.scientifiqueIntervenants = value)}
    />
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-scientifique-other-intervenants"
        >Précisions sur les autres intervenants</label
      >
      <textarea
        class="fr-input"
        id="edit-scientifique-other-intervenants"
        rows="3"
        bind:value={model.scientifiqueOtherIntervenantsDetails}></textarea>
    </div>
  </div>
</fieldset>
