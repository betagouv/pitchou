<script lang="ts">
  import DateInput from "../../common/DateInput.svelte";

  import toJSONPerserveDate from "../../../../commun/DateToJSON.js";
  import { typesDécisionAdministrative } from "../../../../commun/décision-administrative.js";

  import type { DécisionAdministrativePourTransfer } from "../../../../types/API_Pitchou.js";

  type Props = {
    décisionAdministrative: DécisionAdministrativePourTransfer;
    onValider: (décision: DécisionAdministrativePourTransfer) => any;
    onAnnuler?: () => void;
    /** Si fourni, un bouton de suppression de la décision est affiché */
    onSupprimer?: () => void;
  };

  let { décisionAdministrative, onValider, onAnnuler, onSupprimer }: Props = $props();

  // Local editable copy: the form edits this and hands it to onValider, so it
  // never mutates the prop owned by the parent (avoids Svelte's
  // ownership_invalid_mutation warning).
  // svelte-ignore state_referenced_locally
  let decision = $state({ ...décisionAdministrative });

  let fichiers: FileList | undefined = $state();

  const FORMATS_ACCEPTÉS = [".pdf"];
  const TAILLE_MAX_MO = 15;
  const TAILLE_MAX_OCTETS = TAILLE_MAX_MO * 1024 * 1024;

  // File-related error, shown under the upload field
  let messageErreurFichier: string | null = $state(null);
  // "type" field error, shown under the select
  let messageErreurType: string | null = $state(null);
  // Save error (network, server), shown next to the buttons
  let messageErreur: string | null = $state(null);
  let enCours = $state(false);

  function formatTaille(octets: number): string {
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
  }

  function messageErreurLisible(erreur: unknown): string {
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    // d3-fetch rejects with a message like "413 Payload Too Large"
    if (/^413\b/.test(message)) {
      return `Le fichier est trop volumineux pour être envoyé (taille maximale : ${TAILLE_MAX_MO} Mo).`;
    }
    return `L'enregistrement de la décision administrative a échoué : ${message}`;
  }

  async function formSubmit(e: Event) {
    //console.log('submit', fichiers)
    e.preventDefault();

    messageErreurFichier = null;
    messageErreurType = null;
    messageErreur = null;

    // A décision must at least have a type; we reject an empty decision.
    if (!decision.type) {
      messageErreurType = "Veuillez sélectionner un type de décision.";
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

      const nomEnMinuscules = fichier.name.toLowerCase();
      const formatValide = FORMATS_ACCEPTÉS.some((extension) =>
        nomEnMinuscules.endsWith(extension),
      );
      if (!formatValide) {
        messageErreurFichier = `Format de fichier non supporté. Formats acceptés : ${FORMATS_ACCEPTÉS.join(", ")}.`;
        return;
      }

      if (fichier.size > TAILLE_MAX_OCTETS) {
        messageErreurFichier = `Le fichier est trop volumineux (${formatTaille(fichier.size)}). Taille maximale : ${TAILLE_MAX_MO} Mo.`;
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
        messageErreurFichier = `La lecture du fichier a échoué. Veuillez réessayer.`;
        return;
      }

      // retirer le prefix de la dataURL pour ne garder que le contenu en base64
      const dataURLPrefix = `data:${media_type};base64,`;
      contenuBase64 = contenuBase64.slice(dataURLPrefix.length);

      decision.fichier_base64 = {
        nom,
        media_type,
        contenuBase64,
      };
    }

    enCours = true;
    try {
      await onValider(decision);
    } catch (erreur) {
      messageErreur = messageErreurLisible(erreur);
    } finally {
      enCours = false;
    }
  }
</script>

<form onsubmit={formSubmit}>
  <div class="fr-upload-group">
    <label class="fr-label" for="upload-fichier-décision"
      >Fichier de la décision administrative
      <span class="fr-hint-text"
        >Indication : Taille maximale&nbsp;: 15 Mo. Formats supportés&nbsp;: pdf</span
      >
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
      {#if messageErreurFichier}
        <p class="fr-message fr-message--error">{messageErreurFichier}</p>
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
      {#each typesDécisionAdministrative as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
    <div class="fr-messages-group" id="select-type-messages" aria-live="polite">
      {#if messageErreurType}
        <p class="fr-message fr-message--error">{messageErreurType}</p>
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
    {#if messageErreur}
      <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
        <p>{messageErreur}</p>
      </div>
    {/if}
  </div>

  <div class="buttons">
    <button type="submit" class="fr-btn" disabled={enCours}>
      {enCours ? "Sauvegarde en cours…" : "Sauvegarder"}
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
