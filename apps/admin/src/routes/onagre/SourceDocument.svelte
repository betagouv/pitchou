<script lang="ts">
  import type { OnagreDocument } from "@pitchou/types/onagreDocuments.ts";
  import type { PageData } from "./$types";
  import SourceSheet from "./SourceSheet.svelte";
  let {
    document,
    content,
  }: { document: OnagreDocument; content: NonNullable<PageData["sourceDocument"]> } = $props();
  function link(params: Record<string, string>) {
    const { label, ...query } = params;
    void label;
    return `?${new URLSearchParams({ ...query, ...(document.snapshot_id ? { snapshot: String(document.snapshot_id) } : {}) })}`;
  }
</script>

<section class="admin-panel source-summary">
  <div class="source-document-heading">
    <h2>{document.filename}</h2>
    <span class="source-decision">{document.review.decision}</span>
  </div>
  <p>{document.review.summary}</p>
  <dl>
    <dt>Avant cette vérification</dt>
    <dd>{document.review.previous}</dd>
    <dt>Utilisation et raison du choix</dt>
    <dd>{document.review.reason}</dd>
  </dl>
  <div class="source-actions">
    {#each document.review.links as target}<a
        class="fr-btn fr-btn--secondary fr-btn--sm"
        href={link(target)}>{target.label}</a
      >{/each}
    {#if document.has_original}<a
        class="fr-btn fr-btn--secondary fr-btn--sm"
        href={`/onagre/documents/${document.id}`}>Télécharger l'original</a
      >{/if}
  </div>
  <p class="onagre-context">
    {(Number(document.size) / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} Ko · Dump associé
    #{document.snapshot_id} · Ajouté le {new Date(document.created_at).toLocaleDateString("fr-FR")}
  </p>
  <p class="onagre-fingerprint">SHA-256 · {document.fingerprint}</p>
</section>
{#if content.sheets.length}<SourceSheet {content} />{/if}
{#if document.mime === "application/pdf" && document.has_original}
  <section class="admin-panel source-pdf">
    <div class="source-actions">
      <a
        class="fr-btn fr-btn--secondary fr-btn--sm"
        href={`/onagre/documents/${document.id}?inline`}
        target="_blank"
        rel="noreferrer">Ouvrir le PDF original</a
      >
    </div>
    <p class="onagre-context">
      Texte extrait du PDF. Ouvrez l'original pour consulter les captures d'écran, figures et
      tableaux dans leur mise en page.
    </p>
    <pre class="source-text">{content.text}</pre>
  </section>
{:else if content.text}
  <section class="admin-panel">
    <h2>Contenu du document</h2>
    <pre class="source-text">{content.text}</pre>
  </section>
{/if}
