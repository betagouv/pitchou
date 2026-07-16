<script lang="ts">
  import DateInput from "../../DateInput.svelte";

  import toJSONPerserveDate from "@pitchou/common/DateToJSON.js";
  import {
    typesDecisionAdministrative,
    labelForDecisionAdministrativeType,
  } from "@pitchou/common/decision-administrative.js";
  import { uploadSizeHint, uploadSizeError } from "$lib/upload/uploadSizeHint.ts";

  import type { DecisionAdministrativeForTransfer } from "@pitchou/types/API_Pitchou.js";

  type Props = {
    décisionAdministrative: DecisionAdministrativeForTransfer;
    onValider: (decision: DecisionAdministrativeForTransfer) => any;
    onAnnuler?: () => void;
    /** If provided, a button to delete the décision is displayed */
    onSupprimer?: () => void;
  };

  let {
    décisionAdministrative: decisionAdministrative,
    onValider,
    onAnnuler,
    onSupprimer,
  }: Props = $props();

  // Local editable copy: the form edits this and hands it to onValider, so it
  // never mutates the prop owned by the parent (avoids Svelte's
  // ownership_invalid_mutation warning).
  // svelte-ignore state_referenced_locally
  let decision = $state({ ...decisionAdministrative });

  let fichiers: FileList | undefined = $state();

  const ACCEPTED_FORMATS = [".pdf"];

  // File-related error, shown under the upload field
  let fileErrorMessage: string | null = $state(null);
  // "type" field error, shown under the select
  let typeErrorMessage: string | null = $state(null);
  // Save error (network, server), shown next to the buttons
  let errorMessage: string | null = $state(null);
  let inProgress = $state(false);

  function readableErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    // d3-fetch rejects with a message like "413 Payload Too Large"
    if (/^413\b/.test(message)) {
      return `Le fichier est trop volumineux pour être envoyé.`;
    }
    return `L'enregistrement de la décision administrative a échoué : ${message}`;
  }

  async function formSubmit(e: Event) {
    //console.log('submit', fichiers)
    e.preventDefault();

    fileErrorMessage = null;
    typeErrorMessage = null;
    errorMessage = null;

    // A décision must at least have a type; we reject an empty decision.
    if (!decision.type) {
      typeErrorMessage = "Veuillez sélectionner un type de décision.";
      return;
    }

    if (decision.date_signature) {
      Object.defineProperty(decision.date_signature, "toJSON", {
        value: toJSONPerserveDate,
      });
    }
    if (decision.date_fin_obligations) {
      Object.defineProperty(decision.date_fin_obligations, "toJSON", {
        value: toJSONPerserveDate,
      });
    }

    if (fichiers && fichiers.length >= 1) {
      const fichier = fichiers[0];

      const lowercaseName = fichier.name.toLowerCase();
      const isValidFormat = ACCEPTED_FORMATS.some((extension) =>
        lowercaseName.endsWith(extension),
      );
      if (!isValidFormat) {
        fileErrorMessage = `Format de fichier non supporté. Formats acceptés : ${ACCEPTED_FORMATS.join(", ")}.`;
        return;
      }

      const sizeError = uploadSizeError(fichiers);
      if (sizeError) {
        fileErrorMessage = sizeError;
        return;
      }

      const nom = fichier.name;
      const media_type = fichier.type;

      const contenuBase64P = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener(
          "load",
          () => {
            resolve(reader.result as string);
          },
          false,
        );
        reader.addEventListener("error", reject);
        reader.readAsDataURL(fichier);
      });

      let contenuBase64: string;
      try {
        contenuBase64 = await contenuBase64P;
      } catch {
        fileErrorMessage = `La lecture du fichier a échoué. Veuillez réessayer.`;
        return;
      }

      // remove the dataURL prefix to keep only the base64 content
      const dataURLPrefix = `data:${media_type};base64,`;
      contenuBase64 = contenuBase64.slice(dataURLPrefix.length);

      decision.fichier_base64 = {
        nom,
        media_type,
        contenuBase64,
      };
    }

    inProgress = true;
    try {
      await onValider(decision);
    } catch (error) {
      errorMessage = readableErrorMessage(error);
    } finally {
      inProgress = false;
    }
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-upload-group">
    <label class="fr-label" for="upload-fichier-décision"
      >Fichier de la décision administrative
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
    />
    <div class="fr-messages-group" id="upload-fichier-décision-messages" aria-live="polite">
      {#if fileErrorMessage}
        <p class="fr-message fr-message--error">{fileErrorMessage}</p>
      {/if}
    </div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-numéro"> Numéro </label>
    <input
      class="fr-input"
      bind:value={decision.numéro}
      aria-describedby="input-numéro-messages"
      id="input-numéro"
      type="text"
    />
    <div class="fr-messages-group" id="input-numéro-messages" aria-live="polite"></div>
  </div>

  <div class="fr-select-group">
    <label class="fr-label" for="select-type"> Type de décision </label>
    <select
      bind:value={decision.type}
      class="fr-select"
      aria-describedby="select-type-messages"
      id="select-type"
      name="select-type"
    >
      <option value="" selected disabled>Sélectionnez une option</option>
      {#each typesDecisionAdministrative as type}
        <option value={type}>{labelForDecisionAdministrativeType(type)}</option>
      {/each}
    </select>
    <div class="fr-messages-group" id="select-type-messages" aria-live="polite">
      {#if typeErrorMessage}
        <p class="fr-message fr-message--error">{typeErrorMessage}</p>
      {/if}
    </div>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-date-signature">
      Date de signature de la décision administrative
    </label>
    <DateInput id="input-date-signature" bind:date={decision.date_signature}></DateInput>
  </div>

  <div class="fr-input-group">
    <label class="fr-label" for="input-date-fin-obligations"> Date de fin des obligations </label>
    <DateInput id="input-date-fin-obligations" bind:date={decision.date_fin_obligations}
    ></DateInput>
  </div>

  <div class="fr-messages-group" aria-live="polite" role="alert">
    {#if errorMessage}
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
        <p>{errorMessage}</p>
      </div>
    {/if}
  </div>

  <div class="buttons">
    <button type="submit" class="fr-btn" disabled={inProgress}>
      {inProgress ? "Sauvegarde en cours…" : "Sauvegarder"}
    </button>

    {#if onAnnuler}
      <button type="button" class="fr-btn fr-btn--secondary" onclick={onAnnuler}>Annuler</button>
    {/if}

    {#if onSupprimer}
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-close-line"
        onclick={onSupprimer}
      >
        Supprimer cette décision administrative
      </button>
    {/if}
  </div>
</form>

<style lang="scss">
  form {
    margin-top: 1rem;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }
</style>
