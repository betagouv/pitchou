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

<div class="relative" bind:this={sortRoot}>
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
    <ul
      class="absolute z-10 top-[calc(100%+0.25rem)] right-0 min-w-[16rem] fr-m-0 fr-py-1v fr-px-0 list-none bg-[var(--background-default-grey)] border border-[color:var(--border-default-grey)] rounded-[0.25rem] shadow-[var(--overlap-shadow,0_2px_6px_rgba(0,0,0,0.16))]"
      role="menu"
    >
      {#each SORT_MENU_OPTIONS as option (option.key + option.order)}
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked={option.key === sortKey && option.order === sortOrder}
            class="block w-full text-left fr-py-1w fr-px-2w bg-none border-0 cursor-pointer hover:bg-[var(--background-contrast-grey)] [&.active]:font-bold"
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
