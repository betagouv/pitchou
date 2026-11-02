<script lang="ts">
  import type { PageData } from "../$types";
  let {
    groups,
    onRemove,
  }: {
    groups: NonNullable<PageData["groups"]>;
    onRemove: (id: string) => void;
  } = $props();
</script>

<section class="selected-groups" aria-label="Groupes sélectionnés">
  <h3>Groupes sélectionnés <span class="count">{groups.length}</span></h3>
  {#if groups.length}
    <ul>
      {#each groups as group (group.id)}
        <li>
          <div class="group-identity">
            <strong>{group.name}</strong>
            <span class:archived={!group.active}
              >{group.active ? "Groupe actif" : "Groupe archivé"}</span
            >
          </div>
          <button
            type="button"
            aria-label={`Retirer ${group.name}`}
            onclick={() => onRemove(group.id)}
            ><span class="fr-icon-subtract-line fr-icon--sm" aria-hidden="true"></span> Retirer</button
          >
        </li>
      {/each}
    </ul>
  {:else}
    <p>Aucun groupe sélectionné. Ajoutez un groupe dans la liste ci-dessous.</p>
  {/if}
</section>

<style>
  .selected-groups {
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.625rem;
    background: var(--background-default-grey);
  }
  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.9375rem;
  }
  .count {
    border-radius: 0.25rem;
    padding: 0.125rem 0.5rem;
    background: var(--background-contrast-grey);
    font-size: 0.75rem;
  }
  ul {
    padding: 0;
    margin: 0.875rem 0 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 0;
    border-top: 1px solid var(--border-default-grey);
  }
  .group-identity {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 0.875rem;
  }
  button {
    flex-shrink: 0;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    color: var(--text-action-high-blue-france);
    font-size: 0.8125rem;
  }
  .group-identity > span {
    color: var(--text-mention-grey);
    font-size: 0.75rem;
  }
  .group-identity > .archived {
    color: var(--text-default-warning);
  }
  p {
    margin: 0.75rem 0 0;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
</style>
