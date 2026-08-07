<script lang="ts">
  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import DossierLocationFields from "./DossierLocationFields.svelte";
  import TriStateRadio from "./TriStateRadio.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Description du projet" {disabled}>
  <legend class="fr-fieldset__legend fr-h3">2. Description du projet</legend>
  <div class="fr-fieldset__element">
    <div class="fr-input-group w-full">
      <label class="fr-label" for="edit-description">Description synthétique du projet</label>
      <textarea
        class="fr-input w-full"
        id="edit-description"
        rows="5"
        bind:value={model.description}></textarea>
    </div>
  </div>
  <div class="fr-fieldset__element w-full">
    <DossierLocationFields {model} {disabled} />
  </div>
  <div class="fr-fieldset__element">
    <TriStateRadio
      id="edit-linked-ae"
      label="Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"
      emptyLabel="Ne sait pas encore"
      value={model.linkedToAeRegime}
      onChange={(value) => (model.linkedToAeRegime = value)}
    />
  </div>
</fieldset>
