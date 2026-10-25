<script lang="ts">
  import type { OnagreImportPreview } from "@pitchou/types/onagreImport.ts";
  let {
    preview,
    selected,
    disabled,
    onToggle,
  }: {
    preview: OnagreImportPreview;
    selected: string[];
    disabled: boolean;
    onToggle: (id: string, checked: boolean) => void;
  } = $props();
  const labels = {
    ready: "Prête à importer",
    blocked: "Bloquée",
    already_imported: "Déjà importée, inchangée",
    conflict: "Conflit",
  };
</script>

<section class="admin-panel" aria-labelledby="import-preview-title">
  <h2 id="import-preview-title">Aperçu des demandes</h2>
  <p><strong>{preview.policy.title}</strong> · Version {preview.policy.version}</p>
  <p>{preview.policy.description}</p>
  <p class="onagre-context">
    Aperçu valable jusqu'au {new Date(preview.expiresAt).toLocaleString("fr-FR")}. Cochez uniquement
    les demandes que vous souhaitez importer.
  </p>
  {#if preview.policy.omissions.length}
    <details class="import-details">
      <summary>Champs non repris par cette version</summary>
      <ul>
        {#each preview.policy.omissions as omission}<li>{omission}</li>{/each}
      </ul>
    </details>
  {/if}
  <div class="import-records">
    {#each preview.records as record}
      <article class="import-record" aria-label={`Demande ${record.recordId}`}>
        <div class="import-record-heading">
          <div class="import-record-identity">
            <strong>Demande #{record.recordId}</strong>
            <span>{record.name ?? "Projet sans nom"}</span>
            <span class="onagre-context">Code Onagre · {record.code ?? "Non renseigné"}</span>
          </div>
          <span class="import-status" data-status={record.status}>{labels[record.status]}</span>
        </div>
        <p class="onagre-context">
          Date de réception Onagre · {record.receptionDate ?? "Non renseignée"}
        </p>
        {#if record.issues.length}
          <ul class="import-issues">
            {#each record.issues as issue}<li>{issue}</li>{/each}
          </ul>
        {/if}
        {#if record.omissions.length}
          <details class="import-details">
            <summary>Données non reprises pour cette demande</summary>
            <ul>
              {#each record.omissions as omission}<li>{omission}</li>{/each}
            </ul>
          </details>
        {/if}
        {#if record.dossierId !== null}
          <p>
            <a href={`/dossiers/${record.dossierId}`}
              >Ouvrir le dossier Pitchou #{record.dossierId}</a
            >
          </p>
        {/if}
        {#if record.status === "ready"}
          <div class="fr-checkbox-group">
            <input
              id={`import-record-${record.recordId}`}
              type="checkbox"
              checked={selected.includes(record.recordId)}
              {disabled}
              onchange={(event) => onToggle(record.recordId, event.currentTarget.checked)}
            />
            <label class="fr-label" for={`import-record-${record.recordId}`}
              >Importer la demande #{record.recordId}</label
            >
          </div>
        {/if}
      </article>
    {/each}
  </div>
  <details class="import-details">
    <summary>Provenance de l'aperçu et des dates historiques</summary>
    <p>
      Les dates affichées proviennent du dump Onagre. La date du chargement du dump et celle de
      l'import sont distinctes des dates historiques de la demande.
    </p>
    <dl class="import-provenance">
      <dt>Instance source</dt>
      <dd>{preview.sourceInstance}</dd>
      <dt>Dump</dt>
      <dd>#{preview.snapshotId} · {preview.snapshotFingerprint}</dd>
      <dt>Décisions de reprise</dt>
      <dd>{preview.mappingHash}</dd>
      <dt>Entrées de l'aperçu</dt>
      <dd>{preview.inputHash}</dd>
    </dl>
  </details>
</section>
