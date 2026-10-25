<script lang="ts">
  import { page } from "$app/state";
  import type { OnagreFieldRelations } from "@pitchou/types/onagre.ts";
  let { relations }: { relations?: OnagreFieldRelations } = $props();
  let expanded = $state(false);
  let url = $derived(page.shallow?.url ?? page.url);
  function link(table: string, columns: string[]) {
    return `?${new URLSearchParams({ tab: "dump", snapshot: url.searchParams.get("snapshot") ?? "", table, columns: JSON.stringify(columns) })}`;
  }
  const label = (table: string, columns: string[]) =>
    columns.length === 1 ? `${table}.${columns[0]}` : `${table} (${columns.join(", ")})`;
</script>

<section class="source-relations" aria-label="Relations dans Onagre">
  <h4>Relations dans Onagre</h4>
  {#if !relations}
    <p class="onagre-context">
      Les contraintes ne sont pas disponibles dans ce snapshot. Rechargez le dump avec le script de
      préparation à jour.
    </p>
  {:else}
    {#if relations.primaryKey.length}<p class="primary-key">
        {relations.primaryKey.length > 1
          ? `Clé primaire composée · ${relations.primaryKey.join(", ")}`
          : "Clé primaire"}
      </p>{/if}
    {#if relations.outgoing.length}<h5>Clé étrangère vers</h5>
      <ul>
        {#each relations.outgoing as key}<li>
            <a href={link(key.targetTable, key.targetColumns)} target="_blank" rel="noreferrer"
              >{label(key.targetTable, key.targetColumns)}<span class="fr-sr-only"
                >, explorer dans un nouvel onglet</span
              ></a
            >
            {#if key.columns.length > 1}<small>Avec {key.columns.join(", ")}</small>{/if}
          </li>{/each}
      </ul>{/if}
    {#if relations.incoming.length}<h5>Référencé par · {relations.incoming.length}</h5>
      <ul>
        {#each relations.incoming.slice(0, expanded ? undefined : 4) as key}<li>
            <a href={link(key.sourceTable, key.columns)} target="_blank" rel="noreferrer"
              >{label(key.sourceTable, key.columns)}<span class="fr-sr-only"
                >, explorer dans un nouvel onglet</span
              ></a
            >
          </li>{/each}
      </ul>
      {#if relations.incoming.length > 4}<button
          type="button"
          class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
          aria-expanded={expanded}
          onclick={() => (expanded = !expanded)}
          >{expanded
            ? "Réduire la liste"
            : `Voir les ${relations.incoming.length} relations`}</button
        >{/if}
    {/if}
    <p class="onagre-context">
      {!relations.primaryKey.length && !relations.outgoing.length && !relations.incoming.length
        ? "Aucune clé ni référence déclarée pour ce champ dans ce dump."
        : "Contraintes déclarées dans ce dump."}
    </p>
  {/if}
</section>

<style>
  .source-relations {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.6rem;
  }
  h4 {
    font-size: 0.9rem;
    margin: 0 0 0.5rem;
  }
  h5 {
    font-size: 0.8rem;
    margin: 0.75rem 0 0.25rem;
  }
  p,
  ul {
    margin: 0.25rem 0;
    font-size: 0.8rem;
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: 0.2rem 0;
    overflow-wrap: anywhere;
  }
  small {
    display: block;
  }
  .primary-key {
    font-weight: 600;
    color: var(--text-action-high-blue-france);
  }
</style>
