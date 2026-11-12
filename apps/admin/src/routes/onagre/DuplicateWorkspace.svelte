<script lang="ts">
  import { untrack } from "svelte";
  import { page } from "$app/state";
  import "./DuplicateWorkspace/workspace.css";
  import type { DuplicateWorkspace, DuplicateReview } from "@pitchou/types/onagreDuplicates.ts";
  import ProjectReview from "./DuplicateWorkspace/ProjectReview.svelte";
  let { workspace, writable }: { workspace: DuplicateWorkspace; writable: boolean } = $props();
  let search = $state("");
  let filter = $state("pending");
  let selectedId = $state(
    untrack(() => page.url.searchParams.get("project") ?? workspace.projects[0]?.project_id ?? ""),
  );
  const canLeave = () =>
    !document.querySelector('form[data-duplicate-dirty="true"]') ||
    window.confirm("Quitter sans enregistrer les décisions modifiées ?");
  let offset = $state(0);
  const size = 15;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase();
  let decisions = $derived(new Map(workspace.decisions.map((d) => [d.demande_key, d])));
  const pending = (project: DuplicateReview) =>
    project.payload.demandes.filter(
      (d) =>
        d.linkedDossierId === null &&
        (!decisions.has(d.key) || decisions.get(d.key)?.outcome === "pending"),
    ).length;
  let demandes = $derived(workspace.projects.flatMap((p) => p.payload.demandes));
  let linked = $derived(demandes.filter((d) => d.linkedDossierId !== null).length);
  let remaining = $derived(workspace.projects.reduce((total, p) => total + pending(p), 0));
  let results = $derived(
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
  let selected = $derived(
    workspace.projects.find((p) => p.project_id === selectedId) ?? results[offset] ?? results[0],
  );
  $effect(() => {
    if (offset >= results.length) offset = 0;
    // Keep the open project when saving changes its filter status.
    if (!selectedId && selected) selectedId = selected.project_id;
  });
</script>

<section class="admin-panel admin-stack duplicate-review-intro">
  <h2>Doublons à examiner</h2>
  <p>
    Ces projets présentent un rapprochement possible avec des dossiers DN existants. La décision se
    prend par demande : un même projet peut couvrir plusieurs campagnes.
  </p>
  <div class="counts" aria-label="Bilan de la revue">
    <span><strong>{workspace.projects.length}</strong> projets</span>
    <span><strong>{demandes.length}</strong> demandes</span>
    <span><strong>{remaining}</strong> à décider</span>
    <span><strong>{demandes.length - linked - remaining}</strong> décisions enregistrées</span>
    <span><strong>{linked}</strong> déjà reliées</span>
  </div>
  <p>
    Les liens confirmés sont en lecture seule. Les choix enregistrés préparent la reprise ; ils ne
    lancent aucun import et ne modifient aucun dossier DN. L’export des décisions inclut cette revue
    et son historique.
  </p>
  <div class="filters">
    <label
      >Rechercher un projet, une référence ou un dossier DN
      <input
        class="fr-input"
        type="search"
        value={search}
        oninput={(event) => {
          if (canLeave()) {
            search = event.currentTarget.value;
            offset = 0;
            selectedId = "";
          } else event.currentTarget.value = search;
        }}
      />
    </label>
    <label
      >Afficher
      <select
        class="fr-select"
        value={filter}
        onchange={(event) => {
          if (canLeave()) {
            filter = event.currentTarget.value;
            offset = 0;
            selectedId = "";
          } else event.currentTarget.value = filter;
        }}
      >
        <option value="pending">Projets avec une décision en attente</option>
        <option value="done">Projets entièrement examinés</option>
        <option value="all">Tous les projets de la revue</option>
      </select>
    </label>
  </div>
</section>
{#if workspace.projects.length === 0}
  <p class="admin-panel">Aucune revue de doublons n’a été chargée dans cet environnement.</p>
{:else if !selected}
  <p class="admin-panel" role="status">Aucun projet ne correspond à ces filtres.</p>
{:else}
  <div class="duplicate-review-layout">
    <aside class="admin-panel">
      <p>{results.length} projet{results.length > 1 ? "s" : ""} dans la liste</p>
      <nav aria-label="Projets à examiner">
        {#each results.slice(offset, offset + size) as project (project.project_id)}
          <button
            class:active={selected.project_id === project.project_id}
            aria-current={selected.project_id === project.project_id ? "true" : undefined}
            onclick={() => {
              if (canLeave()) selectedId = project.project_id;
            }}
          >
            <strong>{project.payload.name}</strong>
            <span
              >Projet {project.project_id} · {pending(project)} à décider / {project.payload
                .demandes.length} demandes</span
            >
          </button>
        {/each}
      </nav>
      <div class="pagination">
        <button
          class="fr-btn fr-btn--tertiary fr-btn--sm"
          disabled={offset === 0}
          onclick={() => {
            if (!canLeave()) return;
            offset -= size;
            selectedId = "";
          }}>Précédents</button
        >
        <span
          >{Math.floor(offset / size) + 1} / {Math.max(1, Math.ceil(results.length / size))}</span
        >
        <button
          class="fr-btn fr-btn--tertiary fr-btn--sm"
          disabled={offset + size >= results.length}
          onclick={() => {
            if (!canLeave()) return;
            offset += size;
            selectedId = "";
          }}>Suivants</button
        >
      </div>
    </aside>
    {#key selected.project_id}
      <ProjectReview project={selected} {decisions} revisions={workspace.revisions} {writable} />
    {/key}
  </div>
{/if}
