<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { goto } from "$app/navigation";
  import Select from "@pitchou/ui/Select.svelte";
  import type { PageData } from "../$types";
  import { ImportJobsModel, jobLabels, recordLabels } from "./jobs.svelte.ts";
  let {
    data,
    writable,
  }: {
    data: Pick<PageData, "selected" | "snapshots" | "importEnabled" | "importJobs">;
    writable: boolean;
  } = $props();
  const model = new ImportJobsModel(untrack(() => data.importJobs));
  let job = $derived(model.detail?.job);
  let active = $derived(
    model.jobs.find((item) => ["analyzing", "review", "importing"].includes(item.status)),
  );
  let progress = $derived(
    job
      ? job.status === "analyzing"
        ? job.analyzed
        : job.status === "review"
          ? job.total
          : job.processed
      : 0,
  );
  onMount(() => {
    if (model.jobs[0]) void model.load(model.jobs[0].id);
    const timer = setInterval(() => void model.refresh(), 3000);
    return () => {
      clearInterval(timer);
      model.dispose();
    };
  });
</script>

<section class="admin-panel admin-stack">
  <h2>Importer toutes les demandes</h2>
  <p>
    Analysez le dump, puis importez les demandes prêtes. Les demandes bloquées ou en conflit restent
    à examiner. Aucun dossier existant n'est modifié.
  </p>
  {#if data.selected}
    <div class="onagre-field">
      <label for="all-import-snapshot">Dump source</label>
      <Select
        id="all-import-snapshot"
        value={data.selected.id}
        disabled={model.busy}
        options={data.snapshots.map((snapshot) => ({
          value: snapshot.id,
          label: snapshot.filename,
        }))}
        onChange={(value) => void goto(`?tab=import&snapshot=${value}`)}
      />
    </div>
    {#if !data.selected.records_complete}<p class="onagre-notice">
        Chargez un dump complet pour lancer l'analyse.
      </p>{/if}
    <div class="onagre-controls">
      <button
        class="fr-btn"
        disabled={model.busy || !!active || !data.selected.records_complete}
        onclick={() => void model.act("analyze", data.selected!.id)}
        >Analyser toutes les demandes</button
      >
      <span class="onagre-context">L'analyse ne crée aucun dossier. Le suivi est enregistré.</span>
    </div>
    {#if active && active.id !== job?.id}<button
        class="fr-btn fr-btn--secondary"
        onclick={() => void model.load(active!.id)}>Voir l'opération en cours</button
      >{/if}
  {:else}<p>Chargez un dump depuis l'explorateur pour commencer.</p>{/if}
  {#if model.error}<p role="alert" class="fr-alert fr-alert--error">{model.error}</p>{/if}
</section>

{#if job}
  <section class="admin-panel admin-stack" aria-label="Suivi de l'import complet">
    <div class="import-record-heading">
      <div>
        <h2>{jobLabels[job.status]}</h2>
        <p class="onagre-context">
          Dump #{job.snapshotId} · {new Date(job.createdAt).toLocaleString("fr-FR")}
        </p>
      </div>
      <button
        class="fr-btn fr-btn--secondary"
        disabled={model.busy}
        onclick={() => void model.refresh()}>Actualiser le suivi</button
      >
    </div>
    <div
      class="import-job-progress"
      role="progressbar"
      aria-label={job.status === "analyzing" ? "Demandes analysées" : "Demandes traitées"}
      aria-valuemin="0"
      aria-valuemax={job.total || 1}
      aria-valuenow={progress}
    >
      <div style:width={`${job.total ? (progress / job.total) * 100 : 0}%`}></div>
    </div>
    <p role="status">
      {progress.toLocaleString("fr-FR")} / {job.total.toLocaleString("fr-FR")} demandes {job.status ===
        "analyzing" || job.status === "review"
        ? "analysées"
        : "traitées"}
    </p>
    <div class="import-job-counts">
      {#each Object.entries(job.counts) as [status, count]}<div>
          <strong>{count.toLocaleString("fr-FR")}</strong><span
            >{recordLabels[status as keyof typeof recordLabels]}</span
          >
        </div>{/each}
    </div>
    <p class="onagre-notice">{job.policy.description}</p>
    <ul>
      {#each job.policy.omissions as omission}<li>{omission}</li>{/each}
    </ul>
    {#if job.error}<p role="alert" class="fr-alert fr-alert--error">{job.error}</p>{/if}
    {#if job.status === "analyzing" || job.status === "importing"}<p>
        Vous pouvez fermer cette page. Le traitement continue sur le serveur et reprend après un
        redémarrage.
      </p>{/if}
    {#if job.status === "cancelled" || job.status === "failed"}<p>
        Les lots déjà importés sont conservés. Une nouvelle analyse les reconnaîtra et évitera les
        doublons.
      </p>{/if}
    <div class="onagre-controls">
      {#if job.status === "review"}
        <button
          class="fr-btn"
          disabled={model.busy || !writable || !data.importEnabled || !job.counts.ready}
          onclick={() => void model.act("import", job!.snapshotId)}
          >Importer toutes les demandes prêtes · {job.counts.ready}</button
        >
      {/if}
      {#if ["analyzing", "review", "importing"].includes(job.status)}
        <button
          class="fr-btn fr-btn--secondary"
          disabled={model.busy || !writable}
          onclick={() => void model.act("cancel", job!.snapshotId)}>Arrêter cette opération</button
        >
      {/if}
      <a href={`/onagre/import-jobs?jobId=${job.id}&download=1`} download
        >Télécharger le rapport complet</a
      >
    </div>
    <div class="import-job-table">
      <table>
        <thead><tr><th>Demande Onagre</th><th>Résultat</th><th>À examiner</th></tr></thead>
        <tbody
          >{#each model.detail?.records ?? [] as record}<tr>
              <td
                ><strong>{record.name ?? "Sans nom"}</strong><br />{record.code ?? "Sans code"} · #{record.recordId}</td
              >
              <td
                ><span class="import-status" data-status={record.status}
                  >{recordLabels[record.status]}</span
                >
                {#if record.dossierId}<br /><a href={`/dossiers/${record.dossierId}`}
                    >Ouvrir le dossier #{record.dossierId}</a
                  >{/if}</td
              >
              <td
                >{#each record.issues as issue}<p>{issue}</p>{/each}</td
              >
            </tr>{/each}</tbody
        >
      </table>
    </div>
    {#if model.detail}<div class="onagre-controls">
        <button
          class="fr-btn fr-btn--secondary"
          disabled={model.busy || model.detail.page <= 1}
          onclick={() => void model.load(job!.id, model.detail!.page - 1)}>Précédente</button
        >
        <span>Page {model.detail.page} / {model.detail.pages}</span>
        <button
          class="fr-btn fr-btn--secondary"
          disabled={model.busy || model.detail.page >= model.detail.pages}
          onclick={() => void model.load(job!.id, model.detail!.page + 1)}>Suivante</button
        >
      </div>{/if}
  </section>
{/if}
{#if model.jobs.length}<section class="admin-panel admin-stack">
    <h2>Opérations enregistrées</h2>
    {#each model.jobs as previous}<button
        class="fr-btn fr-btn--tertiary"
        disabled={model.busy}
        onclick={() => void model.load(previous.id)}
      >
        {new Date(previous.createdAt).toLocaleString("fr-FR")} · Dump #{previous.snapshotId} · {jobLabels[
          previous.status
        ]} · {previous.counts.created} dossiers créés
      </button>{/each}
  </section>{/if}
