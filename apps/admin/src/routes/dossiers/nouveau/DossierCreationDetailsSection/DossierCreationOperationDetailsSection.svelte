<script lang="ts">
  import {
    showsOperationDetails,
    showsScientificCaptureDetails,
    showsWindFarmDetails,
    type DossierCreationModel,
  } from "../dossierCreationModel.ts";
  import DossierCreationScientificMethods from "./DossierCreationScientificMethods.svelte";
  import DossierCreationWindOperation from "./DossierCreationWindOperation.svelte";
  let { model }: { model: DossierCreationModel } = $props();
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
    {#if showsWindFarmDetails(model)}<DossierCreationWindOperation {model} />{/if}
    {#if showsScientificCaptureDetails(model)}<DossierCreationScientificMethods {model} />{/if}
  </section>
{/if}
