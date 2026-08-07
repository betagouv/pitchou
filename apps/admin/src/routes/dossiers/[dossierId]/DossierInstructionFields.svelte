<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";
  import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";

  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import TriStateSelect from "./TriStateSelect.svelte";

  type Props = { model: DossierAdminFormModel };
  let { model }: Props = $props();

  const actions = [...prochaineActionAttenduePar];
  const hasLegacyAction = $derived(
    !!model.nextActionExpectedFrom && !actions.includes(model.nextActionExpectedFrom as never),
  );
</script>

<fieldset class="fr-fieldset w-full" aria-label="Instruction Pitchou">
  <legend class="fr-fieldset__legend fr-text--bold">Instruction Pitchou</legend>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-free-comment">Commentaire d'instruction</label>
      <textarea class="fr-input" id="edit-free-comment" rows="4" bind:value={model.freeComment}
      ></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      <div class="fr-input-group">
        <label class="fr-label" for="edit-onagre">Identifiant ONAGRE</label>
        <input
          class="fr-input"
          id="edit-onagre"
          type="text"
          bind:value={model.onagreDemandeIdentifier}
        />
      </div>
      <div class="fr-select-group">
        <label class="fr-label" for="edit-next-action">Prochaine action attendue de</label>
        <select class="fr-select" id="edit-next-action" bind:value={model.nextActionExpectedFrom}>
          <option value="">Non renseignée</option>
          {#if hasLegacyAction}<option value={model.nextActionExpectedFrom}
              >{model.nextActionExpectedFrom} (valeur historique)</option
            >{/if}
          {#each actions as action (action)}<option value={action}>{action}</option>{/each}
        </select>
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      <TriStateSelect
        id="edit-ddep-required"
        label="DDEP nécessaire"
        value={model.ddepRequired}
        onChange={(value) => (model.ddepRequired = value)}
      />
      <TriStateSelect
        id="edit-er-mesures"
        label="Mesures ER suffisantes"
        value={model.erMesuresSufficient}
        onChange={(value) => (model.erMesuresSufficient = value)}
      />
      <div class="fr-checkbox-group fr-mt-4w">
        <input type="checkbox" id="edit-enjeu" bind:checked={model.enjeu} />
        <label class="fr-label" for="edit-enjeu">Dossier à enjeu</label>
      </div>
    </div>
  </div>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-consultation-start">Début consultation du public</label>
        <DatePicker
          id="edit-consultation-start"
          label="Début consultation du public"
          value={model.publicConsultationStartDate}
          max={model.publicConsultationEndDate || undefined}
          onChange={(value) => (model.publicConsultationStartDate = value ?? "")}
        />
      </div>
      <div class="fr-input-group min-w-[14rem]">
        <label class="fr-label" for="edit-consultation-end">Fin consultation du public</label>
        <DatePicker
          id="edit-consultation-end"
          label="Fin consultation du public"
          value={model.publicConsultationEndDate}
          min={model.publicConsultationStartDate || undefined}
          onChange={(value) => (model.publicConsultationEndDate = value ?? "")}
        />
      </div>
    </div>
  </div>
</fieldset>
