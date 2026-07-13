<script lang="ts">
  import type { SortKey, SortOrder } from "./dossiersList.ts";

  type Props = {
    sortKey: SortKey;
    sortOrder: SortOrder;
    onSort: (key: SortKey, order: SortOrder) => void;
  };

  let { sortKey, sortOrder, onSort }: Props = $props();

  const TRI_OPTIONS: { key: SortKey; order: SortOrder; label: string }[] = [
    { key: "depositDate", order: "desc", label: "Date de dépôt : les plus récentes" },
    { key: "depositDate", order: "asc", label: "Date de dépôt : les plus anciennes" },
    {
      key: "lastModified",
      order: "desc",
      label: "Date de dernière modification : les plus récentes",
    },
    {
      key: "lastModified",
      order: "asc",
      label: "Date de dernière modification : les plus anciennes",
    },
    { key: "name", order: "asc", label: "Nom du dossier : ordre alphabétique" },
    { key: "name", order: "desc", label: "Nom du dossier : ordre anti-alphabétique" },
  ];

  const triLabel = $derived(
    TRI_OPTIONS.find((option) => option.key === sortKey && option.order === sortOrder)?.label ??
      TRI_OPTIONS[0].label,
  );

  let triOuvert = $state(false);
  let triRoot: HTMLElement | undefined = $state();

  function onBodyClick(event: MouseEvent) {
    if (triOuvert && triRoot && !triRoot.contains(event.target as Node)) triOuvert = false;
  }

  function choisirTri(key: SortKey, order: SortOrder) {
    triOuvert = false;
    onSort(key, order);
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="tri" bind:this={triRoot}>
  <button
    type="button"
    class="fr-btn fr-btn--tertiary"
    aria-haspopup="true"
    aria-expanded={triOuvert}
    onclick={() => (triOuvert = !triOuvert)}
  >
    Tri : {triLabel}
  </button>
  {#if triOuvert}
    <ul class="tri__menu" role="menu">
      {#each TRI_OPTIONS as option (option.key + option.order)}
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={option.key === sortKey && option.order === sortOrder}
            class="tri__option"
            class:actif={option.key === sortKey && option.order === sortOrder}
            onclick={() => choisirTri(option.key, option.order)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .tri {
    position: relative;
  }

  .tri__menu {
    position: absolute;
    z-index: 10;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 16rem;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    background: var(--background-default-grey);
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    box-shadow: var(--overlap-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));
  }

  .tri__option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 1rem;
    background: none;
    border: 0;
    cursor: pointer;

    &:hover {
      background: var(--background-contrast-grey);
    }

    &.actif {
      font-weight: 700;
    }
  }
</style>
