<script lang="ts">
  import { onDestroy } from "svelte";
  import { getOdtTextContent } from "@odfjs/odfjs";
  import { fillTemplates } from "./DossierGenerationDocuments/fill.ts";
  import { getDocumentGenerationTags } from "./DossierGenerationDocuments/generationTags.ts";
  import { loadActivitesMethodesMoyensDePoursuite } from "$lib/especes/activitesMethodesMoyensDePoursuite.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import DocumentTemplateSelection from "./DossierGenerationDocuments/DocumentTemplateSelection.svelte";
  import GeneratedDocuments from "./DossierGenerationDocuments/GeneratedDocuments.svelte";
  import {
    documentTemplateKey,
    mergeDocumentTemplates,
  } from "./DossierGenerationDocuments/templates.ts";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
  import type { ResultatImportFichierEspeces } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";

  let templateFiles: File[] = $state([]);
  let fileInput: HTMLInputElement | undefined = $state();
  let isDraggingTemplates = $state(false);
  let templateSelectionError: string | undefined = $state();

  let documentGenerationError: Error | undefined = $state();

  type Props = {
    dossier: DossierFull;
    especesImpactees: Promise<ResultatImportFichierEspeces> | undefined;
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

  const templateKey = documentTemplateKey;

  function addTemplates(files: FileList | null) {
    const result = mergeDocumentTemplates(templateFiles, files);
    templateFiles = result.templates;
    templateSelectionError = result.error;
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
      // Only the espèces here: the anomalies are the Projet tab's business, and a generated
      // document reports what could be read, exactly as the tab displays it.
      especesImpacts = (await especesImpactees)?.impactEspece;
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
      const documents = await fillTemplates(templates, tags, datetime);

      revokeGeneratedDocumentUrls();
      generatedDocuments = documents.map(({ blob, name }) => ({
        name,
        url: URL.createObjectURL(blob),
        text: blob.arrayBuffer().then(getOdtTextContent),
      }));

      // Documents are assembled here, in the browser: the server only learns of
      // them when told. Failing to record must not hide the generated documents.
      store.capabilities
        .enregistrerDocumentsGeneres?.(
          dossier.id,
          documents.map(({ name }) => name),
        )
        .catch((err) => console.warn(`Échec de l'enregistrement des documents générés`, err));
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
    <DocumentTemplateSelection
      templates={templateFiles}
      bind:dragging={isDraggingTemplates}
      error={templateSelectionError}
      bind:fileInput
      {templateKey}
      onInput={handleFileInputChange}
      onDragOver={handleTemplatesDragOver}
      onDrop={handleTemplatesDrop}
      onRemove={removeTemplate}
    />

    <button class="fr-btn" type="submit" disabled={templateFiles.length === 0}
      >Générer le(s) document(s)</button
    >
  </form>

  <GeneratedDocuments documents={generatedDocuments} />
</div>
