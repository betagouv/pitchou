<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { onDestroy, untrack } from "svelte";
  import { page } from "$app/state";
  import Pagination from "#lib/components/Pagination.svelte";
  import type { DuplicateWorkspace, DuplicateReview } from "@pitchou/types/onagreDuplicates.ts";
  import ProjectDialog from "./DuplicateWorkspace/ProjectDialog.svelte";
  import "./duplicateLists.css";
  let { workspace, writable }: { workspace: DuplicateWorkspace; writable: boolean } = $props();
  let input = $state(""),
    search = $state(""),
    filter = $state("pending"),
    current = $state(1);
  let selectedId = $state(untrack(() => page.url.searchParams.get("project") ?? ""));
  let timer: ReturnType<typeof setTimeout>;
  const size = 20;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase();
  function scheduleSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = input;
      current = 1;
    }, 350);
  }
  onDestroy(() => clearTimeout(timer));
  const decisions = $derived(new Map(workspace.decisions.map((d) => [d.demande_key, d])));
  const pending = (project: DuplicateReview) =>
    project.payload.demandes.filter(
      (d) =>
        d.linkedDossierId === null &&
        (!decisions.has(d.key) || decisions.get(d.key)?.outcome === "pending"),
    ).length;
  const demandes = $derived(workspace.projects.flatMap((p) => p.payload.demandes));
  const remaining = $derived(workspace.projects.reduce((total, p) => total + pending(p), 0));
  const results = $derived(
    workspace.projects.filter((p) => {
      const text = [
        p.payload.name,
        p.project_id,
        p.payload.reason,
        ...p.payload.demandes.map(
          (d) => `${d.id} ${d.reference} ${d.departments.join(" ")} ${d.communes.join(" ")}`,
        ),
        ...p.payload.candidates.map((c) => `${c.id} ${c.name}`),
      ].join(" ");
      return (
        normalize(text).includes(normalize(search)) &&
        (filter === "all" || (filter === "pending" ? pending(p) > 0 : pending(p) === 0))
      );
    }),
  );
  const selected = $derived(workspace.projects.find((p) => p.project_id === selectedId));
  const pages = $derived(Math.max(1, Math.ceil(results.length / size)));
  $effect(() => {
    if (current > pages) current = 1;
  });
</script>

<section class="admin-stack duplicate-list" aria-label="Doublons à examiner">
  <p>
    {workspace.projects.length} projets · {demandes.length} demandes · {remaining} décisions en attente
  </p>
  <div class="filters">
    <label
      >Rechercher un projet, une référence ou un dossier DN<input
        class="fr-input"
        type="search"
        bind:value={input}
        oninput={scheduleSearch}
      /></label
    >
    <div class="onagre-field">
      <label for="duplicate-filter">Avancement</label>
      <Select
        id="duplicate-filter"
        bind:value={filter}
        onChange={() => (current = 1)}
        options={[
          { value: "pending", label: "À examiner" },
          { value: "done", label: "Entièrement examinés" },
          { value: "all", label: "Tous" },
        ]}
      />
    </div>
  </div>
  <div class="list-controls">
    <p role="status">{results.length} projet{results.length > 1 ? "s" : ""}</p>
    <Pagination
      {current}
      total={pages}
      label="Pages des projets à examiner"
      onChange={(value) => (current = value)}
    />
  </div>
  <div class="onagre-table-scroll">
    <table>
      <thead
        ><tr
          ><th>Projet Onagre</th><th>Départements</th><th>Pourquoi examiner</th><th>Demandes</th><th
            >À décider</th
          ></tr
        ></thead
      >
      <tbody>
        {#each results.slice((current - 1) * size, current * size) as project (project.project_id)}
          {@const remaining = pending(project)}
          {@const departments = [
            ...new Set(project.payload.demandes.flatMap((d) => d.departments)),
          ].sort()}
          <tr class="duplicate-row" class:handled={remaining === 0}>
            <td class="name"
              ><button class="row-button" onclick={() => (selectedId = project.project_id)}>
                <span
                  class={remaining ? "fr-icon-time-line" : "fr-icon-checkbox-circle-line"}
                  aria-hidden="true"
                ></span>{project.payload.name}<span class="fr-sr-only">
                  — {remaining ? "À examiner" : "Examiné"}</span
                >
              </button><span class="reference">Projet {project.project_id}</span></td
            >
            <td>{departments.join(", ") || "Non renseignés"}</td>
            <td><span class="reason-preview">{project.payload.reason}</span></td>
            <td>{project.payload.demandes.length}</td><td>{remaining}</td>
          </tr>
        {:else}<tr
            ><td colspan="5"
              >{workspace.projects.length
                ? "Aucun projet pour ces filtres."
                : "Aucune revue de doublons chargée."}</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
</section>
{#if selected}
  {#key selected.project_id}
    <ProjectDialog
      project={selected}
      {decisions}
      revisions={workspace.revisions}
      {writable}
      onClose={() => (selectedId = "")}
    />
  {/key}
{/if}

<style>
  .reason-preview {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-width: 16rem;
    max-width: 38rem;
  }
</style>
