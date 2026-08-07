<script lang="ts">
  import DownloadButton from "$lib/components/DownloadButton.svelte";
  type Props = { count: number; createBlob: () => Promise<Blob> };
  let { count, createBlob }: Props = $props();
</script>

<dialog
  id="modale-validation-saisie"
  class="fr-modal"
  aria-labelledby="modale-validation-saisie-title"
  data-fr-concealing-backdrop="true"
>
  <div class="fr-container fr-container--fluid fr-container-md">
    <div class="fr-grid-row fr-grid-row--center">
      <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
        <div class="fr-modal__body">
          <div class="fr-modal__content">
            <h2 id="modale-validation-saisie-title" class="fr-modal__title">
              Dernière étape : Ajouter votre saisie à votre dossier Démarche Numérique
            </h2>
            <ol class="flex flex-col gap-12">
              <li>
                <span class="fr-text--lg"
                  >Télécharger le document récapitulatif de votre saisie.</span
                >
                <div class="flex justify-center">
                  <DownloadButton
                    classname="fr-btn fr-mt-4v"
                    label={`Télécharger le document récapitulatif (${count} espèce${count > 1 ? "s" : ""})`}
                    makeFilename={() =>
                      `especes-impactées-${new Date().toISOString().slice(0, 16)}.ods`}
                    makeFileContentBlob={createBlob}
                  />
                </div>
              </li>
              <li>
                <span class="fr-text--lg"
                  >Ajouter le document récapitulatif dans votre dossier Démarche Numérique, section
                  "Espèces concernées par la dérogation".</span
                >
              </li>
              <li>
                <span class="fr-text--lg"
                  >Votre liste d'espèces protégées impactées sera liée à votre dossier.</span
                >
              </li>
            </ol>
          </div>
          <div class="fr-modal__footer">
            <button
              aria-controls="modale-validation-saisie"
              title="Fermer"
              type="button"
              class="fr-btn fr-btn--secondary mx-auto">Fermer la fenêtre</button
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</dialog>
