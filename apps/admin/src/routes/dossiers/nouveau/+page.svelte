<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";

  import {
    createDossier,
    loadGroupesInstructeurs,
    AccessDeniedError,
    type AdminGroupeInstructeurs,
  } from "$lib/actions/adminDossiers.ts";

  import DossierCreationAdminSection from "./DossierCreationAdminSection.svelte";
  import DossierCreationDemandeurSection from "./DossierCreationDemandeurSection.svelte";
  import DossierCreationDetailsSection from "./DossierCreationDetailsSection.svelte";
  import DossierCreationInformationSection from "./DossierCreationInformationSection.svelte";
  import DossierCreationLocationSection from "./DossierCreationLocationSection.svelte";
  import DossierCreationJustificationSection from "./DossierCreationJustificationSection.svelte";
  import DossierCreationMapSection from "./DossierCreationMapSection.svelte";
  import DossierCreationSpeciesSection from "./DossierCreationSpeciesSection.svelte";
  import DossierCreationProjectSection from "./DossierCreationProjectSection.svelte";
  import {
    buildCreationPayload,
    createDossierCreationModel,
    showsSpeciesSection,
    showsDestroyedNidsCount,
    showsPreviousAssessment,
    showsScientificPurposes,
    showsWindFarmDetails,
    showsCompensatedNidsCount,
    showsOperationDetails,
    showsCompleteDossierFiles,
    showsNoDerogationArgumentFiles,
  } from "./dossierCreationModel.ts";
  import { requiresScientificDemandeType } from "@pitchou/common/dossierFormOptions.ts";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let groupes = $state<AdminGroupeInstructeurs[]>([]);
  let loadError = $state<string | null>(null);
  let model = $state(createDossierCreationModel());
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  onMount(async () => {
    try {
      groupes = await loadGroupesInstructeurs();
      model.groupeInstructeurs = groupes[0]?.id ?? "";
      etat = "autorise";
    } catch (error) {
      if (!(error instanceof AccessDeniedError)) {
        loadError = error instanceof Error ? error.message : String(error);
      }
      etat = "refuse";
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!model.depotDate) {
      saveError = "La date de dépôt est requise.";
      return;
    }
    const needsSpeciesFile = showsSpeciesSection(model);
    if (needsSpeciesFile && !model.speciesFile) {
      saveError = "Le fichier des espèces concernées est requis.";
      requestAnimationFrame(() => document.getElementById("species-file-button")?.focus());
      return;
    }
    if (
      needsSpeciesFile &&
      (!model.noOtherSatisfactorySolutionJustification.trim() ||
        !model.motifDerogation ||
        !model.motifDerogationJustification.trim())
    ) {
      saveError = "Les justifications de la demande de dérogation sont requises.";
      return;
    }
    if (showsCompleteDossierFiles(model) && model.completeDossierFiles.length === 0) {
      saveError = "Le dossier complet de demande de dérogation est requis.";
      return;
    }
    if (showsNoDerogationArgumentFiles(model) && model.noDerogationArgumentFiles.length === 0) {
      saveError = "L'argumentaire concluant à l'absence de nécessité de dérogation est requis.";
      return;
    }
    if (model.supplementalFiles.length === 0) {
      saveError = "Ajoutez les pièces jointes supplémentaires nécessaires au dossier.";
      return;
    }
    const submissionFiles = [
      ...(needsSpeciesFile && model.speciesFile ? [model.speciesFile] : []),
      ...(showsScientificPurposes(model) ? model.purposeFiles : []),
      ...(showsPreviousAssessment(model) && model.scientifiquePreviousAssessment === "oui"
        ? model.previousAssessmentFiles
        : []),
      ...(model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité" &&
      model.scientifiqueMortalityMeasuresTaken === "oui"
        ? model.mortalityMeasureFiles
        : []),
      ...(showsWindFarmDetails(model)
        ? [...model.windFarmPlanFiles, ...model.eolienProtocolFiles]
        : []),
      ...(showsOperationDetails(model)
        ? model.scientifiqueIntervenants.flatMap(({ cvFiles }) => cvFiles)
        : []),
      ...(showsCompleteDossierFiles(model) ? model.completeDossierFiles : []),
      ...(showsNoDerogationArgumentFiles(model) ? model.noDerogationArgumentFiles : []),
      ...model.supplementalFiles,
    ];
    if (submissionFiles.reduce((total, file) => total + file.size, 0) > 65 * 1024 * 1024) {
      saveError = "La taille totale des fichiers ne doit pas dépasser 65 Mo.";
      return;
    }
    if (!model.description.trim() || !model.aeRegime) {
      saveError = "La description du projet et son régime d'autorisation sont requis.";
      return;
    }
    if (model.aeRegime === "oui" && model.aeProcedures.length === 0) {
      saveError = "Sélectionnez au moins une procédure d'autorisation environnementale.";
      return;
    }
    if (model.aeProcedures.includes("Autre") && !model.aeOtherProcedure.trim()) {
      saveError = "Précisez la procédure justifiant l'autorisation environnementale.";
      return;
    }
    if (
      showsDestroyedNidsCount(model) &&
      (!model.destroyedNidsCount || model.destroyedNidsCount < 1)
    ) {
      saveError = "Le nombre de nids d'Hirondelles à détruire est requis.";
      return;
    }
    if (requiresScientificDemandeType(model.motifDerogation) && !model.limitedSpecimenType) {
      saveError = "Précisez le type de prise ou de détention.";
      return;
    }
    if (showsPreviousAssessment(model) && !model.scientifiquePreviousAssessment) {
      saveError = "Indiquez si la demande concerne un programme de suivi existant.";
      return;
    }
    if (
      showsPreviousAssessment(model) &&
      model.scientifiquePreviousAssessment === "oui" &&
      model.previousAssessmentFiles.length === 0
    ) {
      saveError = "Le bilan des opérations antérieures est requis.";
      return;
    }
    if (
      model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité" &&
      !model.scientifiqueMortalityMeasuresTaken
    ) {
      saveError = "Indiquez si des mesures complémentaires ont été prises.";
      return;
    }
    if (
      showsCompensatedNidsCount(model) &&
      (!model.compensatedNidsCount || model.compensatedNidsCount < 1)
    ) {
      saveError = "Le nombre de nids artificiels posés en compensation est requis.";
      return;
    }
    if (
      needsSpeciesFile &&
      requiresScientificDemandeType(model.motifDerogation) &&
      model.scientifiqueDemandeType.length === 0
    ) {
      saveError = "Sélectionnez au moins un type de demande scientifique.";
      return;
    }

    saving = true;
    saveError = null;
    try {
      const { id } = await createDossier(
        buildCreationPayload(model),
        needsSpeciesFile ? model.speciesFile : null,
        {
          purpose: showsScientificPurposes(model) ? model.purposeFiles : [],
          previousAssessment:
            showsPreviousAssessment(model) && model.scientifiquePreviousAssessment === "oui"
              ? model.previousAssessmentFiles
              : [],
          mortalityMeasures:
            model.mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité" &&
            model.scientifiqueMortalityMeasuresTaken === "oui"
              ? model.mortalityMeasureFiles
              : [],
          windFarmPlan: showsWindFarmDetails(model) ? model.windFarmPlanFiles : [],
          eolienProtocol: showsWindFarmDetails(model) ? model.eolienProtocolFiles : [],
          intervenantCv: showsOperationDetails(model)
            ? model.scientifiqueIntervenants.flatMap(({ cvFiles }) => cvFiles)
            : [],
          completeDossier: showsCompleteDossierFiles(model) ? model.completeDossierFiles : [],
          noDerogationArgument: showsNoDerogationArgumentFiles(model)
            ? model.noDerogationArgumentFiles
            : [],
          supplemental: model.supplementalFiles,
        },
      );
      await goto(`/dossiers/${id}`);
    } catch (error) {
      saveError = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Administration - créer un dossier — Pitchou</title>
</svelte:head>

{#if loadError}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-3w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossiers">
    Retour aux dossiers
  </a>
  <div class="fr-mt-3w fr-mb-5w max-w-4xl">
    <p class="fr-text--lead fr-mb-1w">Nouveau dossier</p>
    <h1 class="fr-mb-2w">Créer une demande de dérogation</h1>
    <p class="fr-text-mention--grey fr-mb-0">
      Le dossier est créé directement dans Pitchou, sans passer par Démarches Numériques.
    </p>
  </div>

  <form class="w-full flex flex-col gap-10" onsubmit={submit}>
    <DossierCreationInformationSection {model} />
    <DossierCreationProjectSection {model} />
    <DossierCreationDemandeurSection {model} />
    <DossierCreationLocationSection {model} />
    <DossierCreationMapSection {model} />
    {#if showsSpeciesSection(model)}
      <DossierCreationSpeciesSection {model} />
      <DossierCreationJustificationSection {model} />
    {/if}
    <DossierCreationDetailsSection {model} />
    <DossierCreationAdminSection {model} {groupes} />

    {#if saveError}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
    {/if}

    <div class="flex flex-row flex-wrap gap-4">
      <button class="fr-btn" type="submit" disabled={saving}>
        {saving ? "Création…" : "Créer le dossier"}
      </button>
      <a class="fr-btn fr-btn--secondary" href="/dossiers">Annuler</a>
    </div>
  </form>
{/if}
