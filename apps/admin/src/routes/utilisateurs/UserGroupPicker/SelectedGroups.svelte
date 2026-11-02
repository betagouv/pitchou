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
          <span
            >{group.name}{#if !group.active}<small>Archivé</small>{/if}</span
          >
          <button
            type="button"
            aria-label={`Retirer ${group.name}`}
            onclick={() => onRemove(group.id)}
            ><span class="fr-icon-close-line fr-icon--sm" aria-hidden="true"></span></button
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
    background: var(--background-alt-grey);
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
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    margin: 0.875rem 0 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    max-width: 100%;
    border: 1px solid var(--border-action-low-blue-france);
    border-radius: 0.5rem;
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
  }
  li > span {
    min-width: 0;
    padding: 0.375rem 0.25rem 0.375rem 0.75rem;
    overflow-wrap: anywhere;
    font-size: 0.875rem;
  }
  button {
    flex-shrink: 0;
    align-self: stretch;
    padding: 0.5rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  small {
    display: block;
    color: var(--text-mention-grey);
    font-size: 0.75rem;
  }
  p {
    margin: 0.75rem 0 0;
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
</style>
