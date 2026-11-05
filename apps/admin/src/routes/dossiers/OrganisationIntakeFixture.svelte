<script lang="ts">
  import type {
    AdminDossierDetail,
    AdminDossierRelationsPayload,
  } from "#lib/actions/adminDossiers.ts";
  import DossierCreationDemandeurSection from "./nouveau/DossierCreationDemandeurSection.svelte";
  import {
    buildCreationPayload,
    createDossierCreationModelFromDetail,
  } from "./nouveau/dossierCreationModel.ts";
  let {
    detail,
    onSave,
  }: { detail: AdminDossierDetail; onSave: (relations: AdminDossierRelationsPayload) => void } =
    $props();
  // svelte-ignore state_referenced_locally
  let model = $state(createDossierCreationModelFromDetail(detail, new Map()));
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    onSave(buildCreationPayload(model).relations);
  }}
>
  <DossierCreationDemandeurSection {model} showPorteurErrors />
  <button type="submit">Enregistrer le porteur</button>
</form>
