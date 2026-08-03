<script lang="ts">
  import { speciesFileError } from "$lib/speciesFile.ts";

  import type { DossierCreationModel } from "./dossierCreationModel.ts";

  let { model }: { model: DossierCreationModel } = $props();
  let input: HTMLInputElement;
  let error = $state<string | null>(null);
  let dragging = $state(false);

  function selectFile(file: File | undefined) {
    if (!file) return;
    error = speciesFileError(file);
    model.speciesFile = error ? null : file;
    if (input) input.value = "";
  }
</script>

<section
  class="border-t border-[color:var(--border-default-grey)] fr-pt-4w"
  aria-labelledby="species-title"
>
  <h2 class="fr-h2" id="species-title">6. Espèces concernées par la dérogation</h2>

  <div class="fr-callout fr-icon-information-line fr-mb-4w">
    <h3 class="fr-callout__title">
      Le remplissage de cette section est indispensable à l'instruction
    </h3>
    <p class="fr-callout__text">
      En suivant
      <a
        class="fr-link"
        href="https://pitchou.beta.gouv.fr/saisie-especes"
        target="_blank"
        rel="noreferrer">ce lien https://pitchou.beta.gouv.fr/saisie-especes</a
      >, vous allez pouvoir remplir un document avec les espèces protégées concernées par votre
      demande de dérogation. Suivez la procédure afin d'obtenir le fichier à déposer ici, sans
      changer son format.
    </p>
  </div>

  <div class="fr-upload-group" class:fr-upload-group--error={error !== null}>
    <p class="fr-label fr-mb-1w" id="species-file-label">
      Déposez ici le fichier téléchargé après remplissage sur
      https://pitchou.beta.gouv.fr/saisie-especes <span aria-hidden="true">*</span>
      <span class="fr-sr-only">Champ obligatoire</span>
    </p>
    <a
      class="fr-link fr-mb-2w inline-block"
      href="https://pitchou.beta.gouv.fr/saisie-especes"
      target="_blank"
      rel="noreferrer">https://pitchou.beta.gouv.fr/saisie-especes</a
    >
    <p class="fr-hint-text" id="species-file-hint">
      Taille maximale par fichier : 65 Mo. Formats acceptés : tableur (.ods, .xlsx).
    </p>

    <div
      class={`min-h-48 border-2 border-dashed flex flex-col items-center justify-center gap-3 fr-p-3w ${dragging ? "border-[color:var(--border-action-high-blue-france)] bg-[var(--background-action-low-blue-france)]" : "border-[color:var(--border-default-grey)]"}`}
      role="group"
      aria-label="Dépôt du fichier des espèces concernées"
      ondragover={(event) => {
        event.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={(event) => {
        event.preventDefault();
        dragging = false;
        selectFile(event.dataTransfer?.files[0]);
      }}
    >
      <span class="fr-icon-upload-2-line fr-icon--lg" aria-hidden="true"></span>
      <p class="fr-mb-0">Faites glisser et déposez votre fichier ici</p>
      <span>ou</span>
      <button
        class="fr-btn fr-btn--secondary"
        id="species-file-button"
        type="button"
        aria-labelledby="species-file-label species-file-button"
        aria-describedby="species-file-hint"
        onclick={() => input.click()}
      >
        Choisir un fichier
      </button>
      <input
        class="fr-sr-only"
        id="species-file"
        type="file"
        accept=".ods,.xlsx,application/vnd.oasis.opendocument.spreadsheet,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Choisir le fichier des espèces concernées"
        aria-required="true"
        aria-describedby="species-file-hint"
        aria-invalid={error !== null}
        tabindex="-1"
        bind:this={input}
        onchange={(event) => selectFile(event.currentTarget.files?.[0])}
      />
    </div>

    {#if model.speciesFile}
      <div class="flex items-center gap-3 fr-mt-2w">
        <p class="fr-mb-0">Fichier sélectionné : {model.speciesFile.name}</p>
        <button
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-delete-line fr-btn--icon-left"
          type="button"
          onclick={() => (model.speciesFile = null)}>Retirer</button
        >
      </div>
    {/if}
    {#if error}<p class="fr-error-text" id="species-file-error" role="alert">{error}</p>{/if}
  </div>
</section>
