<script lang="ts">
  import type { SortKey, SortOrder } from "./dossiersList.ts";

  type Props = {
    sortKey: SortKey;
    sortOrder: SortOrder;
    onSort: (key: SortKey, order: SortOrder) => void;
  };

  let { sortKey, sortOrder, onSort }: Props = $props();

  const SORT_MENU_OPTIONS: { key: SortKey; order: SortOrder; label: string }[] = [
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
  ];

  const sortLabel = $derived(
    SORT_MENU_OPTIONS.find((option) => option.key === sortKey && option.order === sortOrder)
      ?.label ?? SORT_MENU_OPTIONS[0].label,
  );

  let sortMenuOpen = $state(false);
  let sortRoot: HTMLElement | undefined = $state();

  function onBodyClick(event: MouseEvent) {
    if (sortMenuOpen && sortRoot && !sortRoot.contains(event.target as Node)) sortMenuOpen = false;
  }

  function selectSort(key: SortKey, order: SortOrder) {
    sortMenuOpen = false;
    onSort(key, order);
  }
</script>

<svelte:body onclick={onBodyClick} />

<div class="sort" bind:this={sortRoot}>
  <button
    type="button"
    class="fr-btn fr-btn--sm fr-btn--tertiary"
    aria-haspopup="true"
    aria-expanded={sortMenuOpen}
    onclick={() => (sortMenuOpen = !sortMenuOpen)}
  >
    Tri : {sortLabel}
  </button>
  {#if sortMenuOpen}
    <ul class="sort__menu" role="menu">
      {#each SORT_MENU_OPTIONS as option (option.key + option.order)}
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={option.key === sortKey && option.order === sortOrder}
            class="sort__option"
            class:active={option.key === sortKey && option.order === sortOrder}
            onclick={() => selectSort(option.key, option.order)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  .sort {
    position: relative;
  }

  .sort__menu {
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

  .sort__option {
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

    &.active {
      font-weight: 700;
    }
  }
</style>
