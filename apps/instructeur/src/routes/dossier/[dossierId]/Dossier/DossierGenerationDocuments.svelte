<script lang="ts">
  import { onDestroy } from "svelte";
  import { fillOdtTemplate, getOdtTextContent } from "@odfjs/odfjs";
  import { getDocumentGenerationTags } from "./generateDocument.ts";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import { sendEvenement } from "$lib/shared/aarri.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

  let templateFiles: File[] = $state([]);
  let fileInput: HTMLInputElement;
  let isDraggingTemplates = $state(false);
  let templateSelectionError: string | undefined = $state();

  let documentGenerationError: Error | undefined = $state();

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<DescriptionMenacesEspeces> | undefined;
  };

  let { dossier, especesImpactees }: Props = $props();

  type GeneratedDocument = {
    name: string;
    url: string;
    text: Promise<string>;
  };

  let generatedDocuments: GeneratedDocument[] = $state([]);

  function revokeGeneratedDocumentUrls() {
    for (const document of generatedDocuments) {
      URL.revokeObjectURL(document.url);
    }
  }

  onDestroy(revokeGeneratedDocumentUrls);

  function templateKey(template: File): string {
    return `${template.name}:${template.size}:${template.lastModified}`;
  }

  function addTemplates(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    const validTemplates = selectedFiles.filter((file) => file.name.toLowerCase().endsWith(".odt"));
    const existingTemplateKeys = new Set(templateFiles.map(templateKey));

    templateSelectionError =
      validTemplates.length === selectedFiles.length
        ? undefined
        : "Seuls les modèles au format ODT peuvent être ajoutés.";
    templateFiles = [
      ...templateFiles,
      ...validTemplates.filter((template) => !existingTemplateKeys.has(templateKey(template))),
    ];
  }

  function handleFileInputChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    addTemplates(input.files);
    input.value = "";
  }

  function handleTemplatesDragOver(event: DragEvent) {
    event.preventDefault();
    isDraggingTemplates = true;
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function handleTemplatesDrop(event: DragEvent) {
    event.preventDefault();
    isDraggingTemplates = false;
    addTemplates(event.dataTransfer?.files ?? null);
  }

  function removeTemplate(templateToRemove: File) {
    const keyToRemove = templateKey(templateToRemove);
    templateFiles = templateFiles.filter((template) => templateKey(template) !== keyToRemove);
  }

  async function generateDoc(e: SubmitEvent) {
    e.preventDefault();

    const templates = [...templateFiles];
    if (templates.length === 0) {
      throw new Error(`Missing templates`);
    }

    documentGenerationError = undefined;
    let especesImpacts = undefined;

    const {
      identifiantPitchouVersActivitéEtImpactsQuantifiés:
        identifiantPitchouVersActiviteEtImpactsQuantifies,
    } = await loadActivitesMethodesMoyensDePoursuite();

    try {
      // let any errors surface here to be handled below
      especesImpacts = await especesImpactees;
    } catch (e) {
      // @ts-ignore
      documentGenerationError = e;
      return;
    }

    const tags = getDocumentGenerationTags(
      dossier,
      especesImpacts,
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    );

    console.log("balises", tags);

    try {
      const datetime = new Date().toISOString().slice(0, "YYYY-MM-DD:HH-MM".length);
      const documents = await Promise.all(
        templates.map(async (template) => {
          const templateAB = await template.arrayBuffer();
          const documentArrayBuffer = await fillOdtTemplate(templateAB, tags);
          const blob = new Blob([documentArrayBuffer], { type: template.type });
          const extensionStart = template.name.lastIndexOf(".");
          const basename =
            extensionStart === -1 ? template.name : template.name.slice(0, extensionStart);
          const extension = extensionStart === -1 ? "" : template.name.slice(extensionStart);

          return {
            blob,
            name: `${basename}-${datetime}${extension}`,
          };
        }),
      );

      revokeGeneratedDocumentUrls();
      generatedDocuments = documents.map(({ blob, name }) => ({
        name,
        url: URL.createObjectURL(blob),
        text: blob.arrayBuffer().then(getOdtTextContent),
      }));

      sendEvenement({ type: "générerUnDocument" });
    } catch (err) {
      // @ts-ignore
      documentGenerationError = err;
    }
  }
</script>

<div class="row">
  <h2>Génération de documents</h2>

  <p>
    Ici, vous pouvez compléter des <strong>modèles de documents</strong> (mails types, saisines,
    etc.) avec les <strong>informations de ce dossier</strong>. Le document généré reste modifiable
    a posteriori.
  </p>

  <p>Pour vous aider :</p>
  <ul>
    <li>
      <a
        target="_blank"
        href="https://betagouv.github.io/pitchou/instruction/document-types/creation.html"
        >Documentation pour <strong>créer vos propres modèles</strong> de documents</a
      >
    </li>
    <li>
      <a
        target="_blank"
        href="https://betagouv.github.io/pitchou/instruction/document-types/modeles.html"
        >Bibliothèque de modèles mis à disposition</a
      >
    </li>
  </ul>

  {#if documentGenerationError}
    <div class="fr-alert fr-alert--error fr-mb-3w">
      <h3 class="fr-alert__title">Erreur lors de la génération du document :</h3>
      <p>{documentGenerationError}</p>
    </div>
  {/if}

  <form class="fr-mb-4w" onsubmit={generateDoc}>
    <div class="fr-upload-group fr-mb-4w">
      <p class="fr-label fr-mt-4w">Ajouter un ou plusieurs modèles de documents</p>
      <p class="fr-hint-text fr-mb-2w">Format accepté : ODT. Plusieurs fichiers possibles.</p>

      <div
        role="group"
        aria-label="Ajout de modèles de documents"
        class="border-2 border-dashed border-[color:var(--border-default-grey)] bg-[var(--background-contrast-grey)] p-8 text-center {isDraggingTemplates
          ? 'border-[color:var(--border-action-high-blue-france)]'
          : ''}"
        ondragover={handleTemplatesDragOver}
        ondragleave={() => (isDraggingTemplates = false)}
        ondrop={handleTemplatesDrop}
      >
        <span class="fr-icon-upload-2-line fr-icon--lg" aria-hidden="true"></span>
        <p class="fr-mb-1w fr-mt-1w">Glissez-déposez vos modèles ici</p>
        <p class="fr-mb-1w">ou</p>
        <button class="fr-btn fr-btn--secondary" type="button" onclick={() => fileInput.click()}
          >Choisir des fichiers</button
        >
      </div>

      <input
        bind:this={fileInput}
        class="fr-sr-only"
        type="file"
        accept=".odt"
        id="file-upload"
        multiple
        onchange={handleFileInputChange}
      />

      {#if templateSelectionError}
        <p class="fr-error-text fr-mt-1w">{templateSelectionError}</p>
      {/if}

      {#if templateFiles.length > 0}
        <div class="fr-mt-3w" aria-live="polite">
          <p class="font-bold fr-mb-1w">
            {templateFiles.length}
            {templateFiles.length === 1 ? "modèle sélectionné" : "modèles sélectionnés"}
          </p>
          <ul class="m-0 p-0 list-none">
            {#each templateFiles as template (templateKey(template))}
              <li
                class="flex items-center gap-4 border border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] fr-p-2w [&+&]:border-t-0"
              >
                <span class="fr-icon-file-text-line flex-none" aria-hidden="true"></span>
                <span class="min-w-0 flex-1 break-all">{template.name}</span>
                <button
                  class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line flex-none"
                  type="button"
                  onclick={() => removeTemplate(template)}
                >
                  <span class="fr-sr-only">Retirer {template.name}</span>
                </button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>

    <button class="fr-btn" type="submit" disabled={templateFiles.length === 0}
      >Générer le(s) document(s)</button
    >
  </form>

  {#each generatedDocuments as generatedDocument}
    <div class="fr-mb-3w">
      <a
        class="fr-link fr-link--download"
        download={generatedDocument.name}
        href={generatedDocument.url}
      >
        Télécharger {generatedDocument.name}
      </a>
      <details class="[cursor:initial]">
        <summary class="cursor-pointer">Voir le texte brut</summary>
        {#await generatedDocument.text}
          (... en chargement ...)
        {:then text}
          <div class="[white-space:preserve] fr-p-2w bg-[var(--background-contrast-grey)]">
            {text}
          </div>
        {/await}
      </details>
    </div>
  {/each}
</div>
