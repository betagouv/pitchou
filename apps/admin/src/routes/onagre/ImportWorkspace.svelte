<script lang="ts">
  import type { PageData } from "./$types";
  import { ImportModel } from "./ImportWorkspace/model.svelte.ts";
  import ImportSourceSelection from "./ImportWorkspace/ImportSourceSelection.svelte";
  import ImportPreview from "./ImportWorkspace/ImportPreview.svelte";
  import ImportRunResult from "./ImportWorkspace/ImportRunResult.svelte";
  import ImportRunHistory from "./ImportWorkspace/ImportRunHistory.svelte";
  import "./ImportWorkspace/styles.css";

  let {
    data,
    writable,
  }: {
    data: Pick<PageData, "selected" | "snapshots" | "importEnabled" | "importRuns">;
    writable: boolean;
  } = $props();
  const model = new ImportModel();
  let enabled = $derived(writable && data.importEnabled);
  let previousRuns = $derived(data.importRuns.filter((run) => run.runId !== model.run?.runId));
</script>

<div class="import-workspace admin-stack" aria-busy={model.busy}>
  <section class="admin-panel">
    <h2>Tester l'import Onagre <span class="import-experimental">Expérimental</span></h2>
    <p>
      Ce premier import crée des dossiers dans l'environnement de répétition. Consultez les données
      reprises et les omissions avant de sélectionner les demandes à importer.
    </p>
    {#if !data.importEnabled}
      <p class="onagre-notice">
        L'exécution des imports est désactivée sur cet environnement. Vous pouvez calculer un
        aperçu.
      </p>
    {/if}
    {#if !writable}<p class="onagre-notice">
        Votre compte peut consulter les aperçus. L'exécution nécessite le droit de gestion Onagre.
      </p>{/if}
  </section>
  <ImportSourceSelection
    {data}
    bind:input={model.input}
    busy={model.busy}
    onPreview={() => {
      if (data.selected) void model.calculate(data.selected.id);
    }}
  />
  {#if model.error}<p class="fr-alert fr-alert--error" role="alert">{model.error}</p>{/if}
  {#if model.preview && !model.current}
    <p class="onagre-notice" role="status">
      La sélection a changé. Recalculez l'aperçu avant d'importer.
    </p>
  {/if}
  {#if model.preview && model.current}
    <ImportPreview
      preview={model.preview}
      selected={model.selected}
      disabled={!enabled ||
        !model.preview.availability.enabled ||
        model.busy ||
        model.applyAttempted}
      onToggle={(id, checked) => model.toggle(id, checked)}
    />
    <section class="admin-panel" aria-label="Exécuter l'import sélectionné">
      {#if model.preview.availability.reason}<p class="onagre-notice">
          {model.preview.availability.reason}
        </p>{/if}
      {#if model.applyAttempted}
        <p>Recalculez un aperçu pour lancer un nouvel import.</p>
      {:else}
        <p>
          {model.selected.length} demande sélectionnée. Seules les demandes cochées seront importées dans
          cette base.
        </p>
      {/if}
      <button
        class="fr-btn"
        type="button"
        disabled={!enabled ||
          !model.preview.availability.enabled ||
          model.selected.length === 0 ||
          model.busy ||
          model.applyAttempted}
        onclick={() => void model.apply(enabled)}
        >{model.busy
          ? "Import en cours…"
          : `Importer les demandes sélectionnées · ${model.selected.length}`}</button
      >
    </section>
  {/if}
  {#if model.run}<ImportRunResult run={model.run} />{/if}
  {#if previousRuns.length || !model.run}<ImportRunHistory runs={previousRuns} />{/if}
</div>
