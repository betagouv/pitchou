<script lang="ts">
  import { uploadSizeError, uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  import { refreshDossierFull } from "$lib/dossier/dossier.ts";
  import { createPrescriptionControlesFromFichier } from "../decisionAdministrative.ts";
  import {
    importErrorMessage,
    SurfaceConversionRequired,
    type SurfaceConversion,
  } from "../decisionAdministrative/errors.ts";
  import SurfaceConversionReview from "./SurfaceConversionReview.svelte";
  import type {
    FrontEndDecisionAdministrative,
    FrontEndPrescription,
  } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";

  let {
    dossierId,
    decisionAdministrative,
    onimport,
  }: {
    dossierId: Dossier["id"];
    decisionAdministrative: FrontEndDecisionAdministrative;
    onimport: (prescriptions: FrontEndPrescription[], count: number) => void;
  } = $props();

  const inputId = $props.id();
  let file: File | undefined = $state();
  let importing = $state(false);
  let savedCount = $state(0);
  let error = $state("");
  let conversions: SurfaceConversion[] = $state([]);
  let fileInput: HTMLInputElement | undefined = $state();
  let dragging = $state(false);
  const disabled = $derived(importing || savedCount > 0);

  function selectFile(files: FileList | null) {
    if (disabled || !files?.length) return;
    if (files.length !== 1 || !files[0].name.toLowerCase().endsWith(".ods")) {
      error = "Sélectionnez un seul fichier au format ODS.";
      return;
    }
    error = uploadSizeError(files) ?? "";
    if (!error) {
      file = files[0];
      conversions = [];
    }
  }

  async function importPrescriptions() {
    if (!file || importing || savedCount > 0) return;
    error = uploadSizeError([file]) ?? "";
    if (error) return;

    importing = true;
    try {
      savedCount = await createPrescriptionControlesFromFichier(
        await file.arrayBuffer(),
        decisionAdministrative,
        conversions,
      );
      const dossier = await refreshDossierFull(dossierId);
      const savedPrescriptions = dossier.decisionsAdministratives?.find(
        (decision) => decision.id === decisionAdministrative.id,
      )?.prescriptions;
      if (!savedPrescriptions?.length)
        throw new Error("Prescriptions indisponibles après l'import.");
      onimport(savedPrescriptions, savedCount);
    } catch (cause) {
      if (cause instanceof SurfaceConversionRequired) {
        conversions = cause.conversions;
        return;
      }
      error =
        savedCount > 0
          ? "Les prescriptions ont été importées, mais leur affichage n'a pas pu être actualisé. Rechargez la page."
          : importErrorMessage(cause);
    } finally {
      importing = false;
    }
  }
</script>

<section
  class="fr-mb-4w fr-p-3w rounded-[0.5rem] border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)]"
>
  <h6>Import d'un fichier de prescriptions</h6>
  <p>
    Remplissez le <a href="/data/modèles/modèle ajout prescriptions.ods">modèle de prescriptions</a
    >, puis sélectionnez le fichier et cliquez sur « Importer les prescriptions ». Gardez les noms
    des colonnes utilisées. Leur ordre est libre et les colonnes sont optionnelles. Seule la
    première feuille est importée. La colonne « Numéro décision administrative » doit être vide ou
    correspondre au numéro de cette décision. Indiquez les surfaces en m² entiers. Si le fichier
    contient des hectares, leur conversion vous sera proposée avant l'import. Les nombres
    d'individus et de nids doivent être entiers, sans unité.
  </p>
  <div class="fr-upload-group">
    <label class="fr-label fr-mb-2w" for={inputId}>
      Fichier de prescriptions
      <span class="fr-hint-text">{uploadSizeHint()} Format accepté : .ods</span>
    </label>
    {#if !file}
      <div
        role="group"
        aria-label="Ajout d'un fichier de prescriptions"
        aria-disabled={disabled}
        class="border-2 border-dashed bg-[var(--background-contrast-grey)] p-8 text-center {dragging
          ? 'border-[color:var(--border-action-high-blue-france)]'
          : 'border-[color:var(--border-default-grey)]'}"
        ondragover={(event) => {
          event.preventDefault();
          dragging = !disabled;
          if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        ondragleave={() => (dragging = false)}
        ondrop={(event) => {
          event.preventDefault();
          dragging = false;
          selectFile(event.dataTransfer?.files ?? null);
        }}
      >
        <span class="fr-icon-upload-2-line fr-icon--lg" aria-hidden="true"></span>
        <p class="fr-mb-1w fr-mt-1w">Glissez-déposez votre fichier de prescriptions ici</p>
        <p class="fr-mb-1w">ou</p>
        <button
          class="fr-btn fr-btn--secondary"
          type="button"
          {disabled}
          onclick={() => fileInput?.click()}>Choisir un fichier</button
        >
      </div>
    {/if}
    <input
      bind:this={fileInput}
      class="fr-sr-only"
      tabindex="-1"
      type="file"
      accept=".ods"
      id={inputId}
      disabled={disabled || !!file}
      onchange={(event) => {
        selectFile(event.currentTarget.files);
        event.currentTarget.value = "";
      }}
    />
    <div aria-live="polite">
      {#if file}
        <div
          class="flex items-center gap-4 border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w fr-mt-3w"
        >
          <span class="fr-icon-file-text-line flex-none" aria-hidden="true"></span>
          <span class="min-w-0 flex-1 break-all">{file.name}</span>
          <button
            class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line flex-none"
            type="button"
            {disabled}
            onclick={() => {
              file = undefined;
              error = "";
              conversions = [];
            }}><span class="fr-sr-only">Retirer {file.name}</span></button
          >
        </div>
      {/if}
    </div>
  </div>
  {#if conversions.length > 0}
    <SurfaceConversionReview {conversions} />
  {/if}
  <button
    type="button"
    class="fr-btn fr-mt-2w"
    disabled={!file || importing || savedCount > 0}
    onclick={importPrescriptions}
  >
    {importing
      ? "Import en cours…"
      : conversions.length
        ? "Accepter les conversions et importer"
        : "Importer les prescriptions"}
  </button>
  {#if importing}
    <p class="fr-mt-2w" role="status">Lecture du fichier et enregistrement des prescriptions…</p>
  {/if}
  {#if error}
    <p class="fr-alert fr-alert--error fr-mt-2w" role="alert">{error}</p>
  {/if}
</section>
