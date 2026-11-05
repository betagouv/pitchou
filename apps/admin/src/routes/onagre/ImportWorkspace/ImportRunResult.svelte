<script lang="ts">
  import type { OnagreImportRun } from "@pitchou/types/onagreImport.ts";
  import ImportFields from "./ImportFields.svelte";
  let { run }: { run: OnagreImportRun } = $props();
  const labels = {
    created: "Dossier créé",
    already_imported: "Déjà importée, inchangée",
    blocked: "Import bloqué",
    conflict: "Conflit",
    omitted: "Non importée",
  };
  let createdCount = $derived(
    run.outcomes.filter((outcome) => outcome.status === "created").length,
  );
</script>

<section class="admin-panel" aria-labelledby={`import-run-title-${run.runId}`}>
  <h2 id={`import-run-title-${run.runId}`}>Résultat de l'import</h2>
  <p role="status">
    {createdCount} dossier{createdCount > 1 ? "s" : ""} créé{createdCount > 1 ? "s" : ""} sur {run
      .recordIds.length} demande{run.recordIds.length > 1 ? "s" : ""} sélectionnée{run.recordIds
      .length > 1
      ? "s"
      : ""}.
  </p>
  <p class="onagre-context">
    Exécuté le {new Date(run.createdAt).toLocaleString("fr-FR")} · Compte #{run.actorId} · Import {run.runId}
  </p>
  <div class="import-records">
    {#each run.outcomes as outcome}
      <article class="import-record">
        <div class="import-record-heading">
          <strong>Demande #{outcome.recordId}</strong>
          <span class="import-status" data-status={outcome.status}>{labels[outcome.status]}</span>
        </div>
        {#if outcome.dossierId !== null}
          <p>
            <a href={`/dossiers/${outcome.dossierId}`}
              >Ouvrir le dossier Pitchou #{outcome.dossierId}</a
            >
          </p>
        {/if}
        {#if outcome.issues.length}<ul>
            {#each outcome.issues as issue}<li>{issue}</li>{/each}
          </ul>{/if}
        <ImportFields plan={outcome.plan} />
        {#if outcome.omissions.length}
          <details class="import-details">
            <summary>Données non reprises</summary>
            <ul>
              {#each outcome.omissions as omission}<li>{omission}</li>{/each}
            </ul>
          </details>
        {/if}
      </article>
    {/each}
  </div>
  <p>
    <a
      href={`/onagre/imports?runId=${encodeURIComponent(run.runId)}`}
      download={`onagre-import-${run.runId}.json`}>Télécharger le rapport JSON</a
    >
  </p>
</section>
