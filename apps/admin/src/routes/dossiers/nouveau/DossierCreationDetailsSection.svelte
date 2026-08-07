<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    showsCompleteDossierFiles,
    showsNoDerogationArgumentFiles,
    showsOperationDates,
    showsWindFarmDetails,
    type DossierCreationModel,
  } from "./dossierCreationModel.ts";
  import DossierCreationBasicDetails from "./DossierCreationBasicDetails.svelte";
  import DossierCreationScientificHistory from "./DossierCreationScientificHistory.svelte";
  import DossierCreationWindFarm from "./DossierCreationWindFarm.svelte";
  import DossierCreationOperationPeriod from "./DossierCreationOperationPeriod.svelte";
  import DossierCreationOperationDetailsSection from "./DossierCreationOperationDetailsSection.svelte";
  import DossierCreationIntervenantsSection from "./DossierCreationIntervenantsSection.svelte";
  import DossierCreationFileUpload from "./DossierCreationFileUpload.svelte";
  let {
    model,
    existingAttachments,
  }: { model: DossierCreationModel; existingAttachments?: Snippet } = $props();
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="details-title"
>
  <h2 class="fr-h2" id="details-title">8. Détails du projet</h2>
  <DossierCreationBasicDetails {model} />
  <DossierCreationScientificHistory {model} />
  {#if showsWindFarmDetails(model)}<DossierCreationWindFarm {model} />{/if}
  {#if showsOperationDates(model)}<DossierCreationOperationPeriod {model} />{/if}
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
      label="Ajoutez ici, si nécessaire, les pièces jointes supplémentaires à votre dossier"
      bind:uploadedFiles={model.supplementalFiles}
    />
    {@render existingAttachments?.()}
  </section>
</section>
