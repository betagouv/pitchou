<script lang="ts">
  import type { OnagreImportRun } from "@pitchou/types/onagreImport.ts";
  import ImportRunResult from "./ImportRunResult.svelte";

  let { runs }: { runs: OnagreImportRun[] } = $props();
  let expanded = $state<string | null>(null);
</script>

<section class="admin-panel" aria-labelledby="import-history-title">
  <h2 id="import-history-title">Imports enregistrés</h2>
  <p class="onagre-context">
    Les 10 derniers rapports restent consultables après le rechargement de la page. Ils concernent
    tous les dumps de cette base.
  </p>
  {#each runs as run}
    <div class="import-history-row">
      <button
        type="button"
        class="import-history-toggle"
        aria-expanded={expanded === run.runId}
        aria-controls={`import-history-${run.runId}`}
        onclick={() => (expanded = expanded === run.runId ? null : run.runId)}
      >
        <strong>Import du {new Date(run.createdAt).toLocaleString("fr-FR")}</strong>
        <span class="onagre-context"
          >Dump #{run.preview.snapshotId} · {run.recordIds.length} demande{run.recordIds.length > 1
            ? "s"
            : ""} sélectionnée{run.recordIds.length > 1 ? "s" : ""} · {expanded === run.runId
            ? "Masquer le rapport"
            : "Afficher le rapport"}</span
        >
      </button>
      <div id={`import-history-${run.runId}`} hidden={expanded !== run.runId}>
        {#if expanded === run.runId}<ImportRunResult {run} />{/if}
      </div>
    </div>
  {:else}
    <p>Aucun import enregistré dans cette base.</p>
  {/each}
</section>

<style>
  .import-history-row + .import-history-row {
    border-top: 1px solid var(--border-default-grey);
  }
  .import-history-toggle {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    padding: 0.75rem 0.5rem;
    text-align: left;
  }
  .import-history-toggle:hover,
  .import-history-toggle[aria-expanded="true"] {
    background: var(--background-alt-grey);
  }
</style>
