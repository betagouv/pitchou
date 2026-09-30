<script lang="ts">
  import DateInput from "$lib/components/DateInput.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import {
    typesDecisionAdministrative,
    labelForDecisionAdministrativeType,
  } from "@pitchou/common/decisionAdministrative.js";
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  import { uploadProgressLabel } from "$lib/upload/uploadProgress.svelte.ts";
  import {
    preserveDecisionDates,
    uploadDecisionFile,
    readableDecisionError,
  } from "./decisionAdministrativeForm.ts";

  import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.js";

  type Props = {
    decisionAdministrative: DecisionAdministrativeForTransfer;
    hasExistingFile?: boolean;
    onValidate: (decision: DecisionAdministrativeForTransfer) => any;
    onCancel?: () => void;
    /** If provided, a button to delete the décision is displayed */
    onDelete?: () => void;
  };

  let {
    decisionAdministrative,
    hasExistingFile = false,
    onValidate,
    onCancel,
    onDelete,
  }: Props = $props();

  // Local editable copy: the form edits this and hands it to onValidate, so it
  // never mutates the prop owned by the parent (avoids Svelte's
  // ownership_invalid_mutation warning).
  // svelte-ignore state_referenced_locally
  let decision = $state({ ...decisionAdministrative });

  const typeDecisionOptions = [...typesDecisionAdministrative].map((type) => ({
    value: type,
    label: labelForDecisionAdministrativeType(type),
  }));
  let fichiers: FileList | undefined = $state();
  // File-related error, shown under the upload field
  let fileErrorMessage: string | null = $state(null);
  // "type" field error, shown under the select
  let typeErrorMessage: string | null = $state(null);
  // Save error (network, server), shown next to the buttons
  let errorMessage: string | null = $state(null);
  let inProgress = $state(false);
  async function formSubmit(e: Event) {
    //console.log('submit', fichiers)
    e.preventDefault();
    fileErrorMessage = null;
    typeErrorMessage = null;
    errorMessage = null;

    if (!decision.type) {
      typeErrorMessage = "Veuillez sélectionner un type de décision.";
      return;
    }

    if (!decision.number?.trim() || !decision.signature_date || !decision.obligations_end_date) {
      errorMessage = "Veuillez renseigner le numéro et les deux dates de la décision.";
      return;
    }
    if (!hasExistingFile && !decision.fichier_upload && !fichiers?.length) {
      fileErrorMessage = "Veuillez joindre le fichier de la décision administrative.";
      return;
    }

    preserveDecisionDates(decision);

    inProgress = true;
    if (fichiers && fichiers.length >= 1) {
      try {
        decision.fichier_upload = await uploadDecisionFile(decision.dossier, fichiers);
      } catch (error) {
        fileErrorMessage = error instanceof Error ? error.message : String(error);
        inProgress = false;
        return;
      }
    }

    try {
      await onValidate(decision);
    } catch (error) {
      errorMessage = readableDecisionError(error);
    } finally {
      inProgress = false;
    }
  }
</script>

{#snippet requiredMark()}
  <span class="font-bold" aria-hidden="true">*</span>
{/snippet}

<form class="fr-mt-2w" onsubmit={formSubmit}>
  <p class="fr-text--sm">{@render requiredMark()} Champs obligatoires</p>
  <div class="fr-upload-group">
    <label class="fr-label" for="upload-fichier-décision"
      >Fichier de la décision administrative {@render requiredMark()}
      <span class="fr-hint-text">Indication : {uploadSizeHint()} Formats supportés&nbsp;: pdf</span>
    </label>
    <input
      accept=".pdf"
      bind:files={fichiers}
      class="fr-upload"
      aria-describedby="upload-fichier-décision-messages"
      type="file"
      id="upload-fichier-décision"
      name="upload"
      required={!hasExistingFile && !decision.fichier_upload}
    />
    {#if hasExistingFile}
      <p class="fr-hint-text">Un fichier est déjà joint. Vous pouvez le remplacer.</p>
    {/if}
    <div class="fr-messages-group" id="upload-fichier-décision-messages" aria-live="polite">
      {#if fileErrorMessage}
        <p class="fr-message fr-message--error">{fileErrorMessage}</p>
      {/if}
    </div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-numéro">Numéro {@render requiredMark()}</label>
    <input
      class="fr-input"
      bind:value={decision.number}
      aria-describedby="input-numéro-messages"
      id="input-numéro"
      type="text"
      required
    />
    <div class="fr-messages-group" id="input-numéro-messages" aria-live="polite"></div>
  </div>

  <div class="fr-select-group">
    <label class="fr-label" for="select-type">Type de décision {@render requiredMark()}</label>
    <Select
      id="select-type"
      class="fr-mt-1w"
      placeholder="Sélectionnez une option"
      options={typeDecisionOptions}
      bind:value={decision.type}
      required
    />
    <div class="fr-messages-group" id="select-type-messages" aria-live="polite">
      {#if typeErrorMessage}
        <p class="fr-message fr-message--error">{typeErrorMessage}</p>
      {/if}
    </div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-date-signature">
      Date de signature de la décision administrative {@render requiredMark()}
    </label>
    <DateInput
      id="input-date-signature"
      label="Date de signature de la décision administrative"
      bind:date={decision.signature_date}
      required
    />
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-date-fin-obligations"
      >Date de fin des obligations {@render requiredMark()}</label
    >
    <DateInput
      id="input-date-fin-obligations"
      label="Date de fin des obligations"
      bind:date={decision.obligations_end_date}
      required
    />
  </div>

  <div class="fr-messages-group" aria-live="polite" role="alert">
    {#if errorMessage}
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
        <p>{errorMessage}</p>
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap gap-4 items-center">
    <button type="submit" class="fr-btn" disabled={inProgress}>
      {inProgress ? uploadProgressLabel("Sauvegarde en cours…") : "Sauvegarder"}
    </button>

    {#if onCancel}
      <button type="button" class="fr-btn fr-btn--secondary" onclick={onCancel}>Annuler</button>
    {/if}

    {#if onDelete}
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-close-line"
        onclick={onDelete}
      >
        Supprimer cette décision administrative
      </button>
    {/if}
  </div>
</form>
