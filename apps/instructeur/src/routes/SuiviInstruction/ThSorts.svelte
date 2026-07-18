<script lang="ts">
  import clsx from "clsx";

  import type { TableSort } from "@pitchou/types/interfaceUtilisateur.ts";

  type Props = {
    sorts: TableSort[];
    selectedSort?: TableSort | undefined;
  };

  let { sorts, selectedSort = $bindable(undefined) }: Props = $props();

  const selectSort = (sort: TableSort): void => {
    selectedSort = sort;
    sort.sort();
  };
</script>

<ul class="fr-mt-1w">
  {#each sorts as sort}
    <li class="fr-mb-1v">
      <button
        class={clsx(["fr-pt-1v", "fr-pb-1v", { selected: selectedSort === sort }])}
        type="button"
        onclick={() => {
          selectSort(sort);
        }}
      >
        {sort["nom"]}

        {#if sort === selectedSort}
          <span class="fr-icon-check-line" aria-hidden="true"></span>
        {/if}
      </button>
    </li>
  {/each}
</ul>

<style lang="scss">
  ul {
    list-style: none;
    pointer-events: auto;
    padding: 0;

    li {
      padding: 0;
      display: flex;
      list-style: none;
    }
  }

  button {
    color: var(--text-mention-grey);
    text-align: left;
    background-color: var(--background-overlap-grey);

    &:hover {
      background-color: var(--background-overlap-grey-hover);
    }
    &:active {
      background-color: var(--background-overlap-grey-active);
    }

    box-shadow: inset 0 1px 0 0 var(--border-open-blue-france);

    &.selected {
      color: var(--text-active-grey);
    }
  }
</style>
