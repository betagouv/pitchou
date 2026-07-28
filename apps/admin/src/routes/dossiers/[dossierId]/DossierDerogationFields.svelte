<script lang="ts">
  import { motifDerogationOptions } from "@pitchou/common/dossierFormOptions.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();

  const hasLegacyMotif = $derived(
    !!model.motifDerogation && !motifDerogationOptions.includes(model.motifDerogation as never),
  );
</script>

<fieldset class="fr-fieldset w-full" aria-label="Dérogation" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Dérogation</legend>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-no-other-solution">
        Justification de l'absence d'autre solution satisfaisante
      </label>
      <textarea
        class="fr-input w-full"
        id="edit-no-other-solution"
        rows="4"
        bind:value={model.noOtherSatisfactorySolutionJustification}></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-select-group w-full">
      <label class="fr-label" for="edit-motif-derogation">Motif de dérogation</label>
      <select class="fr-select" id="edit-motif-derogation" bind:value={model.motifDerogation}>
        <option value="">Non renseigné</option>
        {#if hasLegacyMotif}
          <option value={model.motifDerogation}>
            {model.motifDerogation} (valeur historique)
          </option>
        {/if}
        {#each motifDerogationOptions as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-motif-justification">
        Justification du motif de dérogation
      </label>
      <textarea
        class="fr-input w-full"
        id="edit-motif-justification"
        rows="4"
        bind:value={model.motifDerogationJustification}></textarea>
    </div>
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
      <div class="fr-input-group">
        <label class="fr-label" for="edit-compensated-nids">
          Nombre de nids artificiels posés en compensation
        </label>
        <input
          class="fr-input"
          id="edit-compensated-nids"
          type="number"
          min="0"
          step="1"
          bind:value={model.compensatedNidsCount}
        />
      </div>
    </div>
  </div>
</fieldset>
