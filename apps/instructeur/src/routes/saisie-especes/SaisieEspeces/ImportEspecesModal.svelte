<script lang="ts">
  import { uploadSizeHint } from "$lib/upload/uploadSizeHint.ts";
  type Props = {
    modal?: HTMLElement;
    input?: HTMLInputElement;
    error?: string;
    onFile: (event: Event & { currentTarget: HTMLInputElement }) => void;
    onImport: () => void;
  };
  let { modal = $bindable(), input = $bindable(), error, onFile, onImport }: Props = $props();
</script>

<dialog
  bind:this={modal}
  id="modale-préremplir-depuis-import"
  class="fr-modal"
  aria-labelledby="modale-préremplir-depuis-import-title-avec-liste"
  aria-modal="true"
>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-8 fr-col-lg-6">
        <div class="fr-modal__body">
          <div class="fr-modal__header">
            <button
              aria-controls="modale-préremplir-depuis-import"
              title="Fermer"
              type="button"
              class="fr-btn--close fr-btn">Fermer</button
            >
          </div>
          <div class="fr-modal__content">
            <h2 id="modale-préremplir-depuis-import-title-avec-liste" class="fr-modal__title">
              Pré-remplir avec une liste déjà réalisée
            </h2>
            <p class="fr-text--sm">
              Vous pouvez choisir un document déjà généré avec cet outil ou un document .ods
              conforme à <a
                href="https://betagouv.github.io/pitchou/projet-pitchou/technique/fichier-especes-ods"
                target="_blank"
                rel="noopener external">la documentation des fichiers d'espèces</a
              >.
            </p>
            <div class="fr-upload-group fr-mt-6w" class:fr-upload-group--error={error}>
              <label class="fr-label" for="file-upload"
                ><span class="fr-hint-text">{uploadSizeHint()} Formats supportés : ods</span></label
              ><input
                bind:this={input}
                aria-label="Importer un fichier d'espèces"
                oninput={onFile}
                class="fr-upload"
                type="file"
                accept=".ods"
                id="file-upload"
                name="file-upload"
              />{#if error}<p class="fr-message fr-message--error [display:unset]">
                  {@html error}
                </p>{/if}
            </div>
          </div>
          <div class="fr-modal__footer">
            <button class="fr-btn fr-ml-auto" onclick={onImport}>Pré-remplir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
