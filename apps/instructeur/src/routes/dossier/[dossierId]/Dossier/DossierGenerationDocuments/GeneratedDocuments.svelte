<script lang="ts">
  import SendByMailModal from "./SendByMailModal.svelte";

  import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

  type GeneratedDocument = { name: string; url: string; text: Promise<string> };
  type Props = { documents: GeneratedDocument[]; dossier: DossierFull };
  let { documents, dossier }: Props = $props();

  /** The document whose mail modal is open, if any. Its text is awaited before opening so the
      modal always has a body to show. */
  let mailDocument: (GeneratedDocument & { resolvedText: string }) | undefined = $state();

  async function openMailModal(document: GeneratedDocument) {
    mailDocument = { ...document, resolvedText: await document.text };
  }
</script>

{#if documents.length > 0}
  <ul class="flex flex-col gap-3 list-none fr-p-0 fr-m-0">
    {#each documents as document}
      <li
        class="fr-p-2w border border-[color:var(--border-default-grey)] rounded-[0.5rem] bg-[var(--background-alt-grey,#f6f6f6)]"
      >
        <p class="flex items-center gap-2 fr-m-0 fr-mb-2w min-w-0">
          <span class="fr-icon-file-text-line fr-icon--sm shrink-0" aria-hidden="true"></span>
          <span class="truncate font-medium" title={document.name}>{document.name}</span>
        </p>

        <div class="flex items-center gap-2 flex-wrap">
          <a
            class="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-download-line"
            download={document.name}
            href={document.url}
          >
            Télécharger
          </a>
          <button
            type="button"
            class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-mail-send-line"
            onclick={() => openMailModal(document)}
          >
            Envoyer par mail
          </button>
        </div>

        <details class="fr-mt-2w">
          <summary class="cursor-pointer fr-text--sm">Voir le texte brut</summary>
          {#await document.text}
            <p class="fr-text--sm fr-mt-1w fr-mb-0">(... en chargement ...)</p>
          {:then text}
            <div
              class="[white-space:preserve] fr-p-2w fr-mt-1w fr-text--sm overflow-x-auto rounded-[0.25rem] bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)]"
            >
              {text}
            </div>
          {/await}
        </details>
      </li>
    {/each}
  </ul>
{/if}

{#if mailDocument}
  <SendByMailModal
    open={true}
    {dossier}
    documentName={mailDocument.name}
    documentUrl={mailDocument.url}
    documentText={mailDocument.resolvedText}
    onClose={() => (mailDocument = undefined)}
  />
{/if}
