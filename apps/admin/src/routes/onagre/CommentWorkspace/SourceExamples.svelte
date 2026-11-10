<script lang="ts">
  import { page } from "$app/state";
  import type { CommentGroup } from "@pitchou/types/onagreComments.ts";
  let { group }: { group: CommentGroup } = $props();
  const populations: Record<string, string> = {
    new_import: "Sélection pour import Onagre",
    linked_dn: "Déjà lié à DN",
    blocked: "Projet bloqué, écarté de l’import",
  };
  function demandeLink(key: string) {
    const params = new URLSearchParams({ tab: "dossiers", demande: key.split(":").at(-1)! });
    const snapshot = page.url.searchParams.get("snapshot");
    if (snapshot) params.set("snapshot", snapshot);
    return `/onagre?${params}`;
  }
</script>

<div class="admin-stack">
  <blockquote>{group.value}</blockquote>
  <p>
    {group.project_count} projets · {group.demande_count} demandes.
    {#if group.category === "unresolved_species"}Même taxon source à examiner.
    {:else}Même formulation, même contexte d’activité et de classification.{/if}
  </p>
  <dl>
    {#if group.payload.context.sourceTaxref}
      <dt>Code TAXREF déclaré dans Onagre</dt>
      <dd>{group.payload.context.sourceTaxref}</dd>
    {/if}
    <dt>Activités Onagre</dt>
    <dd>{group.payload.context.activities?.join(" ; ") || "Non renseignées"}</dd>
    <dt>Méthode Onagre</dt>
    <dd>{group.payload.context.method || "Non renseignée"}</dd>
    <dt>Classification Pitchou</dt>
    <dd>{group.payload.context.classifications?.join(" ; ") || "Non résolue"}</dd>
    <dt>Types d’impact actuellement renseignés</dt>
    <dd>
      {group.payload.context.impactTypes?.map((v) => v ?? "Non résolu").join(" ; ") || "Aucun"}
    </dd>
  </dl>
  <ul>
    {#each Object.entries(group.payload.populations) as [key, count]}<li>
        {populations[key] ?? key} : {count.projects} projets, {count.demandes} demandes.
      </li>{/each}
  </ul>
  <h3>Exemples de demandes</h3>
  {#each group.payload.examples as example}
    <article class="example">
      <strong>Projet Onagre {example.projectId} · {example.species ?? "Taxon non renseigné"}</strong
      >
      <p>
        {#if example.demandeKey.includes(":demandes:")}<a
            href={demandeLink(example.demandeKey)}
            target="_blank"
            rel="noreferrer"
            >Voir la demande {example.demandeKey.split(":").at(-1)} dans un nouvel onglet</a
          >{:else}Demande initiale synthétique{/if}
      </p>
      {#each [["Commentaire sur l’activité", example.activityText], ["Description", example.descriptionText], ["Précision", example.precisionText]] as [label, value]}
        {#if value}<p><strong>{label}</strong><br />{value}</p>{/if}
      {/each}
    </article>
  {/each}
</div>

<style>
  blockquote {
    margin: 0;
    padding: 1rem;
    border-left: 3px solid var(--border-action-high-blue-france);
    background: var(--background-alt-grey);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0.5rem;
  }
  dt {
    font-weight: 700;
  }
  dd {
    margin: 0;
  }
  .example {
    border: 1px solid var(--border-default-grey);
    padding: 1rem;
    border-radius: 0.5rem;
  }
  .example p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
