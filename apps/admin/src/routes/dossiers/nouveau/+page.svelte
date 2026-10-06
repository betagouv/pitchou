<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
  import { pageHeader } from "$lib/pageHeader.svelte.ts";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  import Loader from "@pitchou/ui/Loader.svelte";

  import { loadActiviteReferentiel, type ActiviteAdmin } from "$lib/actions/adminActivites.ts";
  import { createDossier, AccessDeniedError } from "$lib/actions/adminDossiers.ts";
  import {
    activiteCodeByLabel,
    activiteLabelSelectEntries,
    sortedActivites,
  } from "$lib/activiteReferentiel.ts";
  import type { SelectEntry } from "@pitchou/ui/Select/options.ts";

  import DossierIntakeFields from "./DossierIntakeFields.svelte";
  import {
    buildCreationPayload,
    createDossierCreationModel,
    showsSpeciesSection,
  } from "./dossierCreationModel.ts";
  import {
    dossierCreationAttachments,
    validateDossierCreation,
  } from "./dossierCreationSubmission.ts";
  import { uploadProgressLabel } from "$lib/upload/uploadProgress.svelte.ts";

  type Etat = "chargement" | "autorise" | "refuse";
  let etat = $state<Etat>("chargement");
  let activites = $state<ActiviteAdmin[]>([]);
  let activiteEntries = $state<SelectEntry<string>[]>([]);
  let codeByLabel = $state<ReadonlyMap<string, string>>(new Map());
  let loadError = $state<string | null>(null);
  let model = $state(createDossierCreationModel());
  let saving = $state(false);
  let saveError = $state<string | null>(null);

  onMount(async () => {
    try {
      const referentiel = await loadActiviteReferentiel();
      activites = sortedActivites(referentiel);
      activiteEntries = activiteLabelSelectEntries(referentiel);
      codeByLabel = activiteCodeByLabel(referentiel);
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
    const needsSpeciesFile = showsSpeciesSection(model);
    saveError = validateDossierCreation(model);
    if (saveError) return;

    saving = true;
    saveError = null;
    try {
      pageHeader.clearFeedback();
      const { id } = await createDossier(
        buildCreationPayload(model),
        needsSpeciesFile ? model.speciesFile : null,
        dossierCreationAttachments(model),
      );
      await goto(`/dossiers/${id}`);
      pageHeader.showSaved("Dossier créé");
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
  <div class="fr-alert fr-alert--error fr-mb-2w" role="alert">
    <h3 class="fr-alert__title">Erreur lors du chargement</h3>
    <p>{loadError}</p>
  </div>
{:else if etat === "chargement"}
  <Loader />
{:else if etat === "refuse"}
  <div class="fr-alert fr-alert--error fr-mb-2w" role="alert">
    <h3 class="fr-alert__title">Accès réservé aux administrateurs</h3>
    <p>Cette page est réservée aux administrateurs Pitchou.</p>
  </div>
{:else}
  <PageHelp title="Créer un dossier"
    ><h3>Création dans Pitchou</h3>
    <p>
      Le dossier est créé directement dans Pitchou, sans passer par Démarches Numériques. Son
      département principal détermine les groupes qui pourront l'instruire.
    </p></PageHelp
  >

  <form class="dossier-form" onsubmit={submit}>
    <DossierIntakeFields {model} {activites} {activiteEntries} activiteCodeByLabel={codeByLabel} />

    {#if saveError}
      <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{saveError}</p></div>
    {/if}

    <div
      class="sticky bottom-0 z-20 flex flex-row flex-wrap gap-3 rounded-lg border border-[var(--border-default-grey)] bg-[var(--background-lifted-grey)] p-3"
    >
      <button class="fr-btn" type="submit" disabled={saving}>
        {saving ? uploadProgressLabel("Création…") : "Créer le dossier"}
      </button>
      <a class="fr-btn fr-btn--secondary" href="/dossiers">Annuler</a>
    </div>
  </form>
{/if}
