<script lang="ts">
  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";
  import TriStateSelect from "./TriStateSelect.svelte";

  type Props = { model: DossierAdminFormModel; disabled: boolean };
  let { model, disabled }: Props = $props();
</script>

<fieldset class="fr-fieldset w-full" aria-label="Éligibilité et incidences" {disabled}>
  <legend class="fr-fieldset__legend fr-text--bold">Éligibilité et incidences</legend>
  <div class="fr-fieldset__element">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
      <TriStateSelect
        id="edit-linked-ae"
        label="Rattaché au régime d'autorisation environnementale"
        value={model.linkedToAeRegime}
        onChange={(value) => (model.linkedToAeRegime = value)}
      />
      <TriStateSelect
        id="edit-erc-planned"
        label="Mesures ERC prévues"
        value={model.mesuresErcPlanned}
        onChange={(value) => (model.mesuresErcPlanned = value)}
      />
      <TriStateSelect
        id="edit-ecological-inventory"
        label="État des lieux écologique complet réalisé"
        value={model.ecologicalInventoryCompleted}
        onChange={(value) => (model.ecologicalInventoryCompleted = value)}
      />
      <TriStateSelect
        id="edit-especes-influence-area"
        label="Espèces protégées présentes dans l'aire d'influence"
        value={model.especesPresentInInfluenceArea}
        onChange={(value) => (model.especesPresentInInfluenceArea = value)}
      />
      <TriStateSelect
        id="edit-risk-despite-erc"
        label="Risque suffisamment caractérisé malgré les mesures ERC"
        value={model.riskDespiteErcMesures}
        onChange={(value) => (model.riskDespiteErcMesures = value)}
      />
    </div>
  </div>
</fieldset>
