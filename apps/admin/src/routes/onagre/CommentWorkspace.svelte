<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    commentCategories,
    commentOutcomes,
    type CommentWorkspace,
  } from "@pitchou/types/onagreComments.ts";
  import CommentEditor from "./CommentWorkspace/CommentEditor.svelte";
  let { workspace, writable }: { workspace: CommentWorkspace; writable: boolean } = $props();
  function link(changes: Record<string, string | number | null>) {
    const params = new URLSearchParams(page.url.searchParams.toString());
    params.set("tab", "textes");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, String(value));
    }
    return `?${params}`;
  }
</script>

<section class="admin-panel admin-stack">
  {#if workspace.categories.length === 0}<p role="status">
      L’inventaire des commentaires n’a pas encore été chargé dans cet environnement.
    </p>{/if}
  <div>
    <h2>Textes à reprendre dans les champs Pitchou</h2>
    <p>
      Examinez les formulations conservées en commentaires et proposez leur destination. Les
      propositions enregistrées ici ne modifient pas les dossiers.
    </p>
    <p class="onagre-context">
      L’inventaire couvre les projets préparés, y compris les doublons mis de côté. Les demandes DN
      liées restent inchangées. Les comptes sont distincts par ligne et ne s’additionnent pas entre
      les lignes.
    </p>
  </div>
  <form method="GET" class="onagre-controls">
    <input type="hidden" name="tab" value="textes" />
    {#if page.url.searchParams.get("snapshot")}<input
        type="hidden"
        name="snapshot"
        value={page.url.searchParams.get("snapshot")}
      />{/if}
    <label
      >Information à examiner
      <select class="fr-select" name="category" value={workspace.category}>
        {#each Object.entries(commentCategories) as [key, label]}<option value={key}
            >{label} ({workspace.categories.find((c) => c.category === key)?.count ?? 0})</option
          >{/each}
      </select>
    </label>
    <label
      >Rechercher une formulation<input
        class="fr-input"
        name="text"
        value={workspace.search}
        placeholder="capture manuelle, épuisette…"
      /></label
    >
    <label
      >Avancement
      <select class="fr-select" name="outcome" value={workspace.outcome}>
        <option value="all">Tous</option>
        {#each Object.entries(commentOutcomes) as [key, label]}<option value={key}>{label}</option
          >{/each}
      </select>
    </label>
    <button class="fr-btn">Filtrer</button>
  </form>
  <p>
    {workspace.total.toLocaleString("fr-FR")} groupes de formulations et contextes. Triés par nombre de
    demandes concernées.
  </p>
  {#if workspace.category === "unresolved_species"}<p class="fr-alert fr-alert--info">
      Un rapprochement non résolu ne signifie pas que l’espèce n’est pas protégée ou qu’elle est
      absente de TAXREF. Chaque cas doit être examiné dans le référentiel.
    </p>{/if}
  <div class="onagre-table-scroll">
    <table>
      <thead
        ><tr
          ><th>Texte Onagre</th><th>Contexte</th><th>Projets</th><th>Demandes</th><th
            >Proposition</th
          ></tr
        ></thead
      >
      <tbody>
        {#each workspace.groups as group (group.id)}
          <tr>
            <td class="source-text"><a href={link({ textGroup: group.id })}>{group.value}</a></td>
            <td
              >{group.payload.context.activities?.join(" · ") || "Activité non résolue"}<br
              />{group.payload.context.classifications?.join(" · ") ||
                "Classification non résolue"}{#if group.payload.context.method}<br />Méthode : {group
                  .payload.context.method}{/if}</td
            >
            <td>{group.project_count.toLocaleString("fr-FR")}</td>
            <td>{group.demande_count.toLocaleString("fr-FR")}</td>
            <td
              >{commentOutcomes[group.decision?.outcome ?? "pending"]}<br /><a
                href={link({ textGroup: group.id })}>Examiner</a
              ></td
            >
          </tr>
        {:else}<tr><td colspan="5">Aucun groupe pour ces filtres.</td></tr>{/each}
      </tbody>
    </table>
  </div>
  <nav class="onagre-controls" aria-label="Pagination des textes">
    {#if workspace.page > 1}<a href={link({ textPage: workspace.page - 1, textGroup: null })}
        >Page précédente</a
      >{/if}
    <span
      >Page {workspace.page} sur {Math.max(
        1,
        Math.ceil(workspace.total / workspace.pageSize),
      )}</span
    >
    {#if workspace.page * workspace.pageSize < workspace.total}<a
        href={link({ textPage: workspace.page + 1, textGroup: null })}>Page suivante</a
      >{/if}
  </nav>
</section>
{#if workspace.selected}
  {#key `${workspace.selected.id}:${workspace.selected.decision?.version ?? 0}`}
    <CommentEditor
      group={workspace.selected}
      choices={workspace.choices}
      {writable}
      onClose={() => void goto(link({ textGroup: null }), { replace: true, reset: false })}
    />
  {/key}
{/if}

<style>
  .source-text {
    min-width: 18rem;
    max-width: 38rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  td {
    vertical-align: top;
  }
</style>
