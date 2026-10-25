<script lang="ts">
  import type { OnagreActivities } from "@pitchou/types/onagreActivities.ts";
  let { workspace, mappingKey }: { workspace: OnagreActivities; mappingKey: string } = $props();
  let rows = $derived(workspace.rows.filter((row) => row.mappingKeys.includes(mappingKey)));
</script>

{#if rows.length}
  <section class="activity-worksheet" aria-label="Contexte du classeur d'activités">
    <h4>Contexte du classeur</h4>
    {#each rows as row}
      <article>
        <span class="onagre-context"
          >Ligne {row.rowNumber} · Correspondance_Nom_projet_Objet_projet.ods</span
        >
        <dl>
          <dt>Ancien tableau de suivi</dt>
          <dd>{row.tracking || "Non renseigné"}</dd>
          <dt>Objet indiqué dans le classeur</dt>
          <dd>{row.source || "Non renseigné"}</dd>
          <dt>Proposition pour DS</dt>
          <dd>{row.proposal || "Non renseignée"}</dd>
        </dl>
        {#if row.note}<p>{row.note}</p>{/if}
      </article>
    {/each}
    {#if workspace.generalNote}<p class="onagre-context">
        Note générale du classeur : {workspace.generalNote}
      </p>{/if}
  </section>
{/if}

<style>
  .activity-worksheet {
    margin: 1rem 0;
  }
  h4 {
    font-size: 1rem;
    margin: 0 0 0.5rem;
  }
  article {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
  }
  dl {
    margin: 0.5rem 0 0;
  }
  dt {
    font-size: 0.8rem;
    color: var(--text-mention-grey);
  }
  dd {
    margin: 0 0 0.5rem;
  }
</style>
